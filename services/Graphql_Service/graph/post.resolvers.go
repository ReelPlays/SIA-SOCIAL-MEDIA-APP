package graph

import (
	"context"
	"database/sql"
	"fmt"
	"graphql/graph/model"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
	amqp091 "github.com/rabbitmq/amqp091-go"
)

// CreatePost resolver
func (r *mutationResolver) CreatePost(ctx context.Context, input model.CreatePostInput) (*model.Post, error) {
	// Get current user ID (optional, but good for context/validation if needed)
	// currentUserID, errAuth := getCurrentUserID(ctx)
	// if errAuth != nil {
	//  log.Printf("CreatePost Error: Not authenticated: %v", errAuth)
	//  return nil, fmt.Errorf("authentication required")
	// }
	// Ensure input.AuthorID matches currentUserID if needed

	db, err := getDB()
	if err != nil {
		log.Printf("CreatePost DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close() // Close connection used for post insert

	var postID string
	var createdAt time.Time // Capture creation time

	insertCtx, cancelInsert := context.WithTimeout(ctx, 5*time.Second)
	query := `
		INSERT INTO posts (title, content, author_id, created_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING post_id, created_at
	`
	err = db.QueryRowContext(insertCtx, query, input.Title, input.Content, input.AuthorID).Scan(&postID, &createdAt)
	cancelInsert()

	if err != nil {
		log.Printf("Error creating post: %v", err)
		return nil, fmt.Errorf("failed to create post: %v", err)
	}

	log.Printf("Post created with ID: %s by author: %s", postID, input.AuthorID)

	// --- Create Notifications for Followers (Asynchronously) ---
	go func(authorID string, postID string, postCreatedAt time.Time) {
		log.Printf("Starting notification fan-out for post %s by author %s", postID, authorID)
		fanoutCtx, fanoutCancel := context.WithTimeout(context.Background(), 30*time.Second) // Longer timeout for fan-out
		defer fanoutCancel()

		// Get DB connection for this goroutine
		dbFanout, errDb := getDB()
		if errDb != nil {
			log.Printf("CreatePost Fanout DB Error: %v", errDb)
			return
		}
		defer dbFanout.Close()

		// 1. Find followers of the author
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
				continue // Skip this follower on scan error
			}
			followerIDs = append(followerIDs, followerID)
		}
		if errRows := rows.Err(); errRows != nil {
			log.Printf("CreatePost Fanout: Error iterating follower rows: %v", errRows)
			// Continue processing any followers found before the error
		}

		if len(followerIDs) == 0 {
			log.Printf("CreatePost Fanout: No followers found for author %s. No notifications to send.", authorID)
			return
		}

		log.Printf("CreatePost Fanout: Found %d followers for author %s. Inserting notifications...", len(followerIDs), authorID)

		// 2. Prepare notification insert statement
		// Use ON CONFLICT DO NOTHING potentially if multiple posts could trigger same notification? Unlikely here.
		notifQuery := `
            INSERT INTO notifications (recipient_user_id, triggering_user_id, notification_type, entity_id, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `
		stmt, errPrepare := dbFanout.PrepareContext(fanoutCtx, notifQuery)
		if errPrepare != nil {
			log.Printf("CreatePost Fanout: Error preparing notification statement: %v", errPrepare)
			return
		}
		defer stmt.Close()

		// 3. Insert notification for each follower
		notificationType := "new_post"
		isRead := false
		triggeringUserID := authorID
		entityID := postID
		notificationTimestamp := postCreatedAt // Use post creation time for consistency

		insertedCount := 0
		for _, recipientID := range followerIDs {
			// Don't notify the author about their own post
			if recipientID == authorID {
				continue
			}

			_, errInsert := stmt.ExecContext(fanoutCtx, recipientID, triggeringUserID, notificationType, entityID, isRead, notificationTimestamp)
			if errInsert != nil {
				// Log error but continue trying other followers
				log.Printf("CreatePost Fanout: Error inserting notification for recipient %s: %v", recipientID, errInsert)
			} else {
				insertedCount++
			}
		}
		log.Printf("CreatePost Fanout: Finished inserting notifications. %d successful inserts for post %s.", insertedCount, postID)

	}(input.AuthorID, postID, createdAt) // Pass necessary IDs and timestamp

	// --- Publish to RabbitMQ (Optional - Can be kept or removed if direct notification handles it) ---
	// If you keep this, ensure your worker service doesn't *also* create the same notifications
	go func(pID string, title string, aID string) { // Use passed variables
		rabbitmqURL := os.Getenv("RABBITMQ_URL")
		if rabbitmqURL == "" { /* ... handle missing URL ... */
			return
		}
		conn, err := amqp091.Dial(rabbitmqURL)
		if err != nil { /* ... handle error ... */
			return
		}
		defer conn.Close()
		ch, err := conn.Channel()
		if err != nil { /* ... handle error ... */
			return
		}
		defer ch.Close()
		q, err := ch.QueueDeclare("post_created", true, false, false, false, nil)
		if err != nil { /* ... handle error ... */
			return
		}
		body := fmt.Sprintf(`{"postId":"%s","title":"%s","authorId":"%s"}`, pID, title, aID)
		pubCtx, pubCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer pubCancel()
		err = ch.PublishWithContext(pubCtx, "", q.Name, false, false, amqp091.Publishing{ /* ... */ Body: []byte(body)})
		if err != nil { /* ... handle error ... */
		}
	}(postID, input.Title, input.AuthorID) // Pass variables to this goroutine too

	// Return the created post details immediately
	return &model.Post{
		PostID:    postID,
		Title:     input.Title,
		Content:   input.Content,
		AuthorID:  input.AuthorID,
		CreatedAt: createdAt.Format(time.RFC3339), // Use actual timestamp
	}, nil
}

// GetPost resolver
func (r *queryResolver) GetPost(ctx context.Context, postID string) (*model.Post, error) {
	// ... (Keep existing implementation) ...
	db, err := getDB()
	if err != nil {
		log.Printf("GetPost DB Error: %v", err)
		return nil, err
	}
	defer db.Close()
	var post model.Post
	var createdAt time.Time
	var updatedAt sql.NullTime
	query := `SELECT post_id, title, content, author_id, created_at, updated_at FROM posts WHERE post_id = $1`
	scanCtx, cancelScan := context.WithTimeout(ctx, 5*time.Second)
	defer cancelScan()
	err = db.QueryRowContext(scanCtx, query, postID).Scan(&post.PostID, &post.Title, &post.Content, &post.AuthorID, &createdAt, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("post not found")
		}
		log.Printf("Error fetching post %s: %v", postID, err)
		return nil, fmt.Errorf("failed to fetch post")
	}
	post.CreatedAt = createdAt.Format(time.RFC3339)
	if updatedAt.Valid {
		updatedStr := updatedAt.Time.Format(time.RFC3339)
		post.UpdatedAt = &updatedStr
	}
	// Fetch Author details separately if needed or join in the query
	// For simplicity, assuming author details are fetched by frontend or another resolver
	return &post, nil
}

// ListPosts resolver
func (r *queryResolver) ListPosts(ctx context.Context) ([]*model.Post, error) {
	// ... (Keep existing implementation, but ensure author is fetched if needed by frontend query) ...
	db, err := getDB()
	if err != nil {
		log.Printf("ListPosts DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()

	// Decide if you need author details here based on your GraphQL query (e.g., LIST_POSTS)
	// If LIST_POSTS includes author { ... }, you need to JOIN here or fetch separately.
	// Example JOIN (adjust based on your actual query needs):
	query := `
		SELECT p.post_id, p.title, p.content, p.author_id, p.created_at, p.updated_at,
		       a.first_name, a.last_name -- Add other author fields if needed by LIST_POSTS query
		FROM posts p
		LEFT JOIN accounts a ON p.author_id = a.id
		ORDER BY p.created_at DESC
		LIMIT 50 -- Add limit/offset if needed
	`
	queryCtx, cancelQuery := context.WithTimeout(ctx, 10*time.Second)
	defer cancelQuery()
	rows, err := db.QueryContext(queryCtx, query)
	if err != nil {
		log.Printf("ListPosts DB Error querying: %v", err)
		return nil, fmt.Errorf("failed to list posts")
	}
	defer rows.Close()

	posts := []*model.Post{}
	for rows.Next() {
		var post model.Post
		var author model.Account // Use the model type for the author
		var createdAt time.Time
		var updatedAt sql.NullTime
		// Add variables to scan author details into
		var authorFirstName sql.NullString
		var authorLastName sql.NullString

		// Adjust scan based on selected columns
		err := rows.Scan(
			&post.PostID, &post.Title, &post.Content, &post.AuthorID, &createdAt, &updatedAt,
			&authorFirstName, &authorLastName, // Scan author details
		)
		if err != nil {
			log.Printf("ListPosts DB Error scanning row: %v", err)
			continue
		}

		post.CreatedAt = createdAt.Format(time.RFC3339)
		if updatedAt.Valid {
			formattedUpdatedAt := updatedAt.Time.Format(time.RFC3339)
			post.UpdatedAt = &formattedUpdatedAt
		}

		// Populate author details
		author.AccountID = post.AuthorID // We know the author ID from the post table
		if authorFirstName.Valid {
			author.FirstName = authorFirstName.String
		}
		if authorLastName.Valid {
			author.LastName = authorLastName.String
		}
		// Populate other author fields if fetched and needed

		post.Author = &author // Assign the populated author struct
		posts = append(posts, &post)
	}
	if err = rows.Err(); err != nil {
		log.Printf("ListPosts DB Error iterating rows: %v", err)
		return nil, fmt.Errorf("error reading posts list")
	}
	return posts, nil
}
