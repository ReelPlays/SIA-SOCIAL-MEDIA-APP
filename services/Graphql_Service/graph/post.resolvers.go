package graph

import (
	"context"
	"database/sql"
	"fmt"
	"graphql/graph/model" // Ensure this path is correct
	"log"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

// --- Mutation Resolvers ---

// CreatePost resolver - Belongs to mutationResolver
// Ensure the receiver (r *mutationResolver) is correct
func (r *mutationResolver) CreatePost(ctx context.Context, input model.CreatePostInput) (*model.Post, error) {
	db, err := getDB()
	if err != nil {
		log.Printf("CreatePost DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()

	var postID string
	var createdAt time.Time
	insertCtx, cancelInsert := context.WithTimeout(ctx, 5*time.Second)
	defer cancelInsert()
	query := `INSERT INTO posts (title, content, author_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING post_id, created_at`
	err = db.QueryRowContext(insertCtx, query, input.Title, input.Content, input.AuthorID).Scan(&postID, &createdAt)
	if err != nil {
		log.Printf("Error creating post: %v", err)
		return nil, fmt.Errorf("failed to create post: %v", err)
	}

	log.Printf("Post created with ID: %s by author: %s", postID, input.AuthorID)

	// --- Create Notifications for Followers ---
	go func(authorID string, postID string, postCreatedAt time.Time) {
		log.Printf("Starting notification fan-out for post %s by author %s", postID, authorID)
		fanoutCtx, fanoutCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer fanoutCancel()
		dbFanout, errDb := getDB()
		if errDb != nil {
			log.Printf("CreatePost Fanout DB Error: %v", errDb)
			return
		}
		defer dbFanout.Close()

		followersQuery := `SELECT follower_user_id FROM follows WHERE followed_user_id = $1`
		rows, errQuery := dbFanout.QueryContext(fanoutCtx, followersQuery, authorID)
		if errQuery != nil {
			log.Printf("CreatePost Fanout: Error querying followers for author %s: %v", authorID, errQuery)
			return
		}
		defer rows.Close()

		var followerIDs []string
		for rows.Next() {
			var followerID string
			if errScan := rows.Scan(&followerID); errScan != nil {
				log.Printf("CreatePost Fanout: Error scanning follower ID: %v", errScan)
				continue
			}
			followerIDs = append(followerIDs, followerID)
		}
		if errRows := rows.Err(); errRows != nil {
			log.Printf("CreatePost Fanout: Error iterating follower rows: %v", errRows)
		}
		if len(followerIDs) == 0 {
			log.Printf("CreatePost Fanout: No followers found for author %s.", authorID)
			return
		}

		log.Printf("CreatePost Fanout: Found %d followers for author %s. Inserting notifications...", len(followerIDs), authorID)
		notifQuery := `INSERT INTO notifications (recipient_user_id, triggering_user_id, notification_type, entity_id, is_read, created_at) VALUES ($1, $2, $3, $4, $5, $6)`
		stmt, errPrepare := dbFanout.PrepareContext(fanoutCtx, notifQuery)
		if errPrepare != nil {
			log.Printf("CreatePost Fanout: Error preparing notification statement: %v", errPrepare)
			return
		}
		defer stmt.Close()

		notificationType := "new_post"
		isRead := false
		triggeringUserID := authorID
		entityID := postID
		notificationTimestamp := postCreatedAt
		insertedCount := 0
		for _, recipientID := range followerIDs {
			if recipientID == authorID {
				continue
			}
			_, errInsert := stmt.ExecContext(fanoutCtx, recipientID, triggeringUserID, notificationType, entityID, isRead, notificationTimestamp)
			if errInsert != nil {
				log.Printf("CreatePost Fanout: Error inserting notification for recipient %s: %v", recipientID, errInsert)
			} else {
				insertedCount++
			}
		}
		log.Printf("CreatePost Fanout: Finished inserting notifications. %d successful inserts for post %s.", insertedCount, postID)
	}(input.AuthorID, postID, createdAt)

	// --- Publish to RabbitMQ (Optional) ---
	go func(pID string, title string, aID string) {
		// ... (existing rabbitmq logic, ensure it's correct if used) ...
	}(postID, input.Title, input.AuthorID)

	return &model.Post{PostID: postID, Title: input.Title, Content: input.Content, AuthorID: input.AuthorID, CreatedAt: createdAt.Format(time.RFC3339)}, nil
} // End of CreatePost function

// --- Query Resolvers ---

// GetPost resolver - Belongs to queryResolver
func (r *queryResolver) GetPost(ctx context.Context, postID string) (*model.Post, error) {
	db, err := getDB()
	if err != nil {
		log.Printf("GetPost DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()
	var post model.Post
	var author model.Account
	var createdAt time.Time
	var updatedAt sql.NullTime
	var authorFirstName, authorLastName sql.NullString
	var isFollowingAuthor sql.NullBool
	currentUserID, _ := getCurrentUserID(ctx)
	queryCtx, cancelQuery := context.WithTimeout(ctx, 5*time.Second)
	defer cancelQuery()
	query := `SELECT p.post_id, p.title, p.content, p.author_id, p.created_at, p.updated_at, a.first_name, a.last_name, EXISTS (SELECT 1 FROM follows WHERE follower_user_id = $1 AND followed_user_id = p.author_id) as is_following_author FROM posts p JOIN accounts a ON p.author_id = a.id WHERE p.post_id = $2`
	err = db.QueryRowContext(queryCtx, query, currentUserID, postID).Scan(&post.PostID, &post.Title, &post.Content, &post.AuthorID, &createdAt, &updatedAt, &authorFirstName, &authorLastName, &isFollowingAuthor)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Return nil for not found
		}
		log.Printf("Error fetching post %s: %v", postID, err)
		return nil, fmt.Errorf("failed to fetch post")
	}
	post.CreatedAt = createdAt.Format(time.RFC3339)
	if updatedAt.Valid {
		updatedStr := updatedAt.Time.Format(time.RFC3339)
		post.UpdatedAt = &updatedStr
	}
	author.AccountID = post.AuthorID
	if authorFirstName.Valid {
		author.FirstName = authorFirstName.String
	}
	if authorLastName.Valid {
		author.LastName = authorLastName.String
	}
	if isFollowingAuthor.Valid {
		author.IsFollowing = &isFollowingAuthor.Bool
	} else {
		defaultFollowStatus := false
		author.IsFollowing = &defaultFollowStatus
	}
	post.Author = &author
	return &post, nil
} // End of GetPost function

// ListPosts resolver - Belongs to queryResolver (fetches ALL posts)
func (r *queryResolver) ListPosts(ctx context.Context) ([]*model.Post, error) {
	db, err := getDB()
	if err != nil {
		log.Printf("ListPosts DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()
	currentUserID, _ := getCurrentUserID(ctx)
	query := `SELECT p.post_id, p.title, p.content, p.author_id, p.created_at, p.updated_at, a.first_name, a.last_name, EXISTS (SELECT 1 FROM follows WHERE follower_user_id = $1 AND followed_user_id = p.author_id) as is_following_author FROM posts p LEFT JOIN accounts a ON p.author_id = a.id ORDER BY p.created_at DESC LIMIT 50`
	queryCtx, cancelQuery := context.WithTimeout(ctx, 10*time.Second)
	defer cancelQuery()
	rows, err := db.QueryContext(queryCtx, query, currentUserID)
	if err != nil {
		log.Printf("ListPosts DB Error querying: %v", err)
		return nil, fmt.Errorf("failed to list posts")
	}
	defer rows.Close()
	posts := []*model.Post{}
	for rows.Next() {
		var post model.Post
		var author model.Account
		var createdAt time.Time
		var updatedAt sql.NullTime
		var authorFirstName, authorLastName sql.NullString
		var isFollowingAuthor sql.NullBool
		err := rows.Scan(&post.PostID, &post.Title, &post.Content, &post.AuthorID, &createdAt, &updatedAt, &authorFirstName, &authorLastName, &isFollowingAuthor)
		if err != nil {
			log.Printf("ListPosts DB Error scanning row: %v", err)
			continue
		}
		post.CreatedAt = createdAt.Format(time.RFC3339)
		if updatedAt.Valid {
			formattedUpdatedAt := updatedAt.Time.Format(time.RFC3339)
			post.UpdatedAt = &formattedUpdatedAt
		}
		author.AccountID = post.AuthorID
		if authorFirstName.Valid {
			author.FirstName = authorFirstName.String
		}
		if authorLastName.Valid {
			author.LastName = authorLastName.String
		}
		if isFollowingAuthor.Valid {
			author.IsFollowing = &isFollowingAuthor.Bool
		} else {
			defaultFollowStatus := false
			author.IsFollowing = &defaultFollowStatus
		}
		post.Author = &author
		posts = append(posts, &post)
	}
	if err = rows.Err(); err != nil {
		log.Printf("ListPosts DB Error iterating rows: %v", err)
		return nil, fmt.Errorf("error reading posts list")
	}
	return posts, nil
} // End of ListPosts function

// GetFeed resolver - Belongs to queryResolver
// Corrected signature with *int32
func (r *queryResolver) GetFeed(ctx context.Context, limit *int32, offset *int32) ([]*model.Post, error) {
	currentUserID, err := getCurrentUserID(ctx)
	if err != nil {
		log.Printf("GetFeed Error: Not authenticated: %v", err)
		return []*model.Post{}, nil
	}

	db, err := getDB()
	if err != nil {
		log.Printf("GetFeed DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()

	// Use int32 for defaults and parameters
	actualLimit := int32(20)
	if limit != nil && *limit > 0 {
		actualLimit = *limit
	}
	actualOffset := int32(0)
	if offset != nil && *offset >= 0 {
		actualOffset = *offset
	}

	// --- Find who the current user follows ---
	followsCtx, followsCancel := context.WithTimeout(ctx, 5*time.Second)
	defer followsCancel()
	followsQuery := `SELECT followed_user_id FROM follows WHERE follower_user_id = $1`
	rowsFollows, errFollows := db.QueryContext(followsCtx, followsQuery, currentUserID)
	if errFollows != nil {
		log.Printf("GetFeed: Error querying follows: %v", errFollows)
		return nil, fmt.Errorf("failed to retrieve following list")
	}
	defer rowsFollows.Close()
	followedIDs := []string{}
	for rowsFollows.Next() {
		var followedID string
		if errScan := rowsFollows.Scan(&followedID); errScan != nil {
			log.Printf("GetFeed: Error scanning followed ID: %v", errScan)
			continue
		}
		followedIDs = append(followedIDs, followedID)
	}
	if errRows := rowsFollows.Err(); errRows != nil {
		log.Printf("GetFeed: Error iterating followed rows: %v", errRows)
	}
	if len(followedIDs) == 0 {
		log.Printf("GetFeed: User %s follows no one.", currentUserID)
		return []*model.Post{}, nil
	}

	// --- Build Query for Posts ---
	var postsQueryBuilder strings.Builder
	args := []interface{}{}
	argCounter := 1
	postsQueryBuilder.WriteString(`SELECT p.post_id, p.title, p.content, p.author_id, p.created_at, p.updated_at, a.first_name, a.last_name, EXISTS (SELECT 1 FROM follows WHERE follower_user_id = $`)
	postsQueryBuilder.WriteString(fmt.Sprintf("%d", argCounter))
	args = append(args, currentUserID)
	argCounter++
	postsQueryBuilder.WriteString(` AND followed_user_id = p.author_id) as is_following_author FROM posts p JOIN accounts a ON p.author_id = a.id WHERE p.author_id = ANY($`)
	postsQueryBuilder.WriteString(fmt.Sprintf("%d", argCounter))
	args = append(args, fmt.Sprintf("{%s}", strings.Join(followedIDs, ",")))
	argCounter++
	postsQueryBuilder.WriteString(") ORDER BY p.created_at DESC") // Added closing parenthesis for ANY
	postsQueryBuilder.WriteString(fmt.Sprintf(" LIMIT $%d", argCounter))
	args = append(args, actualLimit)
	argCounter++
	postsQueryBuilder.WriteString(fmt.Sprintf(" OFFSET $%d", argCounter))
	args = append(args, actualOffset)
	argCounter++
	finalPostsQuery := postsQueryBuilder.String()
	log.Printf("Executing GetFeed query for user %s: [%s] with args: %v", currentUserID, finalPostsQuery, args)

	// --- Execute and Scan ---
	postsCtx, postsCancel := context.WithTimeout(ctx, 15*time.Second)
	defer postsCancel()
	rowsPosts, errPosts := db.QueryContext(postsCtx, finalPostsQuery, args...)
	if errPosts != nil {
		log.Printf("GetFeed: DB Error querying posts: %v", errPosts)
		return nil, fmt.Errorf("failed to fetch feed posts")
	}
	defer rowsPosts.Close()
	posts := []*model.Post{}
	for rowsPosts.Next() {
		var post model.Post
		var author model.Account
		var createdAt time.Time
		var updatedAt sql.NullTime
		var authorFirstName, authorLastName sql.NullString
		var isFollowingAuthor bool
		errScan := rowsPosts.Scan(&post.PostID, &post.Title, &post.Content, &post.AuthorID, &createdAt, &updatedAt, &authorFirstName, &authorLastName, &isFollowingAuthor)
		if errScan != nil {
			log.Printf("GetFeed: Error scanning post row: %v", errScan)
			continue
		}
		post.CreatedAt = createdAt.Format(time.RFC3339)
		if updatedAt.Valid {
			formattedUpdatedAt := updatedAt.Time.Format(time.RFC3339)
			post.UpdatedAt = &formattedUpdatedAt
		}
		author.AccountID = post.AuthorID
		if authorFirstName.Valid {
			author.FirstName = authorFirstName.String
		}
		if authorLastName.Valid {
			author.LastName = authorLastName.String
		}
		author.IsFollowing = &isFollowingAuthor
		post.Author = &author
		posts = append(posts, &post)
	}
	if errRows := rowsPosts.Err(); errRows != nil {
		log.Printf("GetFeed: Error iterating posts rows: %v", errRows)
		return nil, fmt.Errorf("error reading feed posts list")
	}

	log.Printf("GetFeed: Returning %d posts for user %s", len(posts), currentUserID)
	return posts, nil
} // End of GetFeed function
