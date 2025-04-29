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
	db, err := getDB()
	if err != nil {
		log.Printf("Database connection error: %v", err)
		return nil, err
	}
	defer db.Close()

	var postID string
	query := `
		INSERT INTO posts (title, content, author_id, created_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING post_id
	`

	err = db.QueryRowContext(ctx, query, input.Title, input.Content, input.AuthorID).Scan(&postID)
	if err != nil {
		log.Printf("Error creating post: %v", err)
		return nil, fmt.Errorf("failed to create post: %v", err)
	}

	// Publish a message to RabbitMQ
	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	conn, err := amqp091.Dial(rabbitmqURL)
	if err != nil {
		log.Printf("failed to connect to RabbitMQ: %v", err)
	} else {
		defer conn.Close()

		ch, err := conn.Channel()
		if err != nil {
			log.Printf("failed to open a channel: %v", err)
		} else {
			defer ch.Close()

			q, err := ch.QueueDeclare(
				"post_created", // Queue name
				true,           // Durable
				false,          // Delete when unused
				false,          // Exclusive
				false,          // No-wait
				nil,            // Arguments
			)
			if err != nil {
				log.Printf("failed to declare a queue: %v", err)
			}

			body := fmt.Sprintf(`{"postId":"%s","title":"%s","authorId":"%s"}`, postID, input.Title, input.AuthorID)
			err = ch.PublishWithContext(ctx,
				"",     // Exchange
				q.Name, // Routing key
				false,  // Mandatory
				false,  // Immediate
				amqp091.Publishing{
					ContentType: "application/json",
					Body:        []byte(body),
					Timestamp:   time.Now(),
				},
			)
			if err != nil {
				log.Printf("failed to publish a message: %v", err)
			}
		}
	}

	return &model.Post{
		PostID:    postID,
		Title:     input.Title,
		Content:   input.Content,
		AuthorID:  input.AuthorID,
		CreatedAt: time.Now().Format(time.RFC3339),
	}, nil
}

// GetPost resolver
func (r *queryResolver) GetPost(ctx context.Context, postID string) (*model.Post, error) {
	db, err := getDB()
	if err != nil {
		log.Printf("Database connection error: %v", err)
		return nil, err
	}
	defer db.Close()

	var post model.Post
	query := `
		SELECT post_id, title, content, author_id, created_at, updated_at
		FROM posts
		WHERE post_id = $1
	`
	err = db.QueryRowContext(ctx, query, postID).Scan(
		&post.PostID, &post.Title, &post.Content, &post.AuthorID, &post.CreatedAt, &post.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("post not found")
		}
		log.Printf("Error fetching post: %v", err)
		return nil, fmt.Errorf("failed to fetch post: %v", err)
	}

	return &post, nil
}

// ListPosts resolver
func (r *queryResolver) ListPosts(ctx context.Context) ([]*model.Post, error) {
	db, err := getDB()
	if err != nil {
		log.Printf("Database connection error: %v", err)
		return nil, err
	}
	defer db.Close()

	query := `
		SELECT post_id, title, content, author_id, created_at, updated_at
		FROM posts
	`
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		log.Printf("Error fetching posts: %v", err)
		return nil, fmt.Errorf("failed to fetch posts: %v", err)
	}
	defer rows.Close()

	var posts []*model.Post
	for rows.Next() {
		var post model.Post
		err := rows.Scan(&post.PostID, &post.Title, &post.Content, &post.AuthorID, &post.CreatedAt, &post.UpdatedAt)
		if err != nil {
			log.Printf("Error scanning post row: %v", err)
			continue
		}
		posts = append(posts, &post)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating post rows: %v", err)
		return nil, fmt.Errorf("error fetching posts: %v", err)
	}

	return posts, nil
}

// Author resolver for Post.author
type postResolver struct{ *Resolver }

func (r *postResolver) Author(ctx context.Context, obj *model.Post) (*model.Account, error) {
	db, err := getDB()
	if err != nil {
		log.Printf("Database connection error: %v", err)
		return nil, err
	}
	defer db.Close()

	var account model.Account
	query := `
		SELECT id, email, first_name, last_name, address, phone, age, gender, created_at, updated_at
		FROM accounts
		WHERE id = $1
	`
	err = db.QueryRowContext(ctx, query, obj.AuthorID).Scan(
		&account.AccountID,
		&account.Email,
		&account.FirstName,
		&account.LastName,
		&account.Address,
		&account.Phone,
		&account.Age,
		&account.Gender,
		&account.CreatedAt,
		&account.UpdatedAt,
	)
	if err != nil {
		log.Printf("Error fetching account for author_id %s: %v", obj.AuthorID, err)
		return nil, fmt.Errorf("author not found")
	}

	return &account, nil
}
