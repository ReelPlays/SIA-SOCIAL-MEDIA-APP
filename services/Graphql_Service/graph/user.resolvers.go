// graph/user.resolvers.go

package graph

import (
	"context"
	"database/sql"
	"fmt"
	"graphql/graph/model" // Adjust import path if needed
	"log"
	"os"
	"time"

	_ "github.com/lib/pq" // PostgreSQL driver
	amqp091 "github.com/rabbitmq/amqp091-go"
)

// Add this AccountResolver interface definition
type AccountResolver interface {
	IsFollowing(ctx context.Context, obj *model.Account) (*bool, error)
}

// Ensure this line exists to connect the interface to the main Resolver struct
// If it doesn't exist, add it. If it exists but points to a different type, adjust accordingly.
func (r *Resolver) Account() AccountResolver { return &accountResolver{r} }

// Add this struct definition
type accountResolver struct{ *Resolver }

// Add this resolver function for the 'isFollowing' field
// IsFollowing is the resolver for the isFollowing field.
func (r *accountResolver) IsFollowing(ctx context.Context, obj *model.Account) (*bool, error) {
	// Get the ID of the user making the request
	currentUserID, err := getCurrentUserID(ctx)
	if err != nil {
		// If no user is logged in, they can't be following anyone
		f := false
		return &f, nil // Return false, not an error
	}

	// The user whose profile/account is being checked
	targetUserID := obj.AccountID

	// Cannot follow yourself
	if currentUserID == targetUserID {
		f := false
		return &f, nil
	}

	db, err := getDB()
	if err != nil {
		log.Printf("IsFollowing resolver DB Error: %v", err)
		// Return false on error, as we can't determine follow status
		f := false
		return &f, nil
		// Alternatively, you could return an error:
		// return nil, fmt.Errorf("internal server error checking follow status")
	}
	defer db.Close()

	var exists bool
	queryCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `SELECT EXISTS (SELECT 1 FROM follows WHERE follower_user_id = $1 AND followed_user_id = $2)`
	err = db.QueryRowContext(queryCtx, query, currentUserID, targetUserID).Scan(&exists)

	if err != nil {
		log.Printf("IsFollowing resolver DB query error (%s -> %s): %v", currentUserID, targetUserID, err)
		// Return false on query error
		f := false
		return &f, nil
		// Alternatively:
		// return nil, fmt.Errorf("failed to check follow status")
	}

	return &exists, nil
}

// --- Keep your existing resolvers below ---

// Register is the resolver for the register field.
func (r *mutationResolver) Register(ctx context.Context, input model.RegisterInput) (*model.Account, error) {
	// ... (keep existing implementation)
	db, err := getDB()
	if err != nil {
		log.Printf("Register DB Error: %v", err)
		return nil, fmt.Errorf("internal error connecting to DB") // Mask internal error
	}
	defer db.Close()

	// Insert the new account into the database
	var accountID string
	var createdAt time.Time
	insertCtx, cancelInsert := context.WithTimeout(ctx, 5*time.Second)
	defer cancelInsert() // Ensure context is cancelled
	err = db.QueryRowContext(insertCtx, `
        INSERT INTO accounts (email, password, first_name, last_name, address, phone, age, gender, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id, created_at
    `, input.Email, input.Password, input.FirstName, input.LastName, input.Address, input.Phone, input.Age, input.Gender).Scan(&accountID, &createdAt)
	// Removed duplicate cancelInsert() call

	if err != nil {
		// TODO: Check for specific errors like duplicate email if needed
		log.Printf("Register DB Error inserting account: %v", err)
		return nil, fmt.Errorf("internal error registering account") // Mask internal error
	}

	// Publish a message to RabbitMQ (optional, but was in original code)
	go func() { // Run in goroutine to avoid blocking registration response
		rabbitmqURL := os.Getenv("RABBITMQ_URL") // Example: "amqp://guest:guest@localhost:5672/"
		if rabbitmqURL == "" {
			log.Println("Register: RABBITMQ_URL not set, skipping message publish.")
			return
		}
		conn, err := amqp091.Dial(rabbitmqURL)
		if err != nil {
			log.Printf("Register: failed to connect to RabbitMQ: %v", err)
			return
		}
		defer conn.Close()

		ch, err := conn.Channel()
		if err != nil {
			log.Printf("Register: failed to open a channel: %v", err)
			return
		}
		defer ch.Close()

		q, err := ch.QueueDeclare(
			"user_registered", // Queue name
			true,              // Durable
			false,             // Delete when unused
			false,             // Exclusive
			false,             // No-wait
			nil,               // Arguments
		)
		if err != nil {
			log.Printf("Register: failed to declare a queue: %v", err)
			return
		}

		body := fmt.Sprintf(`{"accountId":"%s","email":"%s"}`, accountID, input.Email)
		// Use background context for publishing as original request context might expire
		pubCtx, pubCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer pubCancel()
		err = ch.PublishWithContext(pubCtx,
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
			log.Printf("Register: failed to publish user_registered message: %v", err)
		} else {
			log.Printf("Register: Published user_registered message for %s", accountID)
		}
	}()

	// Return the created account
	return &model.Account{
		AccountID: accountID,
		Email:     input.Email,
		FirstName: input.FirstName,
		LastName:  input.LastName,
		Address:   input.Address,
		Phone:     input.Phone,
		Age:       input.Age,
		Gender:    input.Gender,
		CreatedAt: createdAt.Format(time.RFC3339), // Use actual timestamp
		// UpdatedAt will be nil initially
	}, nil
}

// FollowUser is the resolver for the followUser field.
func (r *mutationResolver) FollowUser(ctx context.Context, userIdToFollow string) (*model.Account, error) {
	// ... (keep existing implementation)
	currentUserID, err := getCurrentUserID(ctx) // Uses helper from auth.go
	if err != nil {
		log.Printf("FollowUser Error: Not authenticated: %v", err)
		return nil, fmt.Errorf("authentication required")
	}

	// Use parameter name directly
	if currentUserID == userIdToFollow {
		return nil, fmt.Errorf("cannot follow yourself")
	}

	db, err := getDB()
	if err != nil {
		log.Printf("FollowUser DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()

	// --- Fetch the account being followed ---
	var followedAccount model.Account
	var createdAt time.Time
	var updatedAt sql.NullTime
	queryCtx, cancelQuery := context.WithTimeout(ctx, 5*time.Second)
	defer cancelQuery() // Ensure context is cancelled
	// Use parameter name directly
	err = db.QueryRowContext(queryCtx,
		`SELECT id, email, first_name, last_name, address, phone, age, gender, created_at, updated_at
         FROM accounts WHERE id = $1`, userIdToFollow).Scan(
		&followedAccount.AccountID, &followedAccount.Email, &followedAccount.FirstName, &followedAccount.LastName,
		&followedAccount.Address, &followedAccount.Phone, &followedAccount.Age, &followedAccount.Gender,
		&createdAt, &updatedAt,
	)
	// Removed duplicate cancelQuery() call

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user to follow not found")
		}
		// Use parameter name directly
		log.Printf("FollowUser DB Error querying followed user %s: %v", userIdToFollow, err)
		return nil, fmt.Errorf("internal server error")
	}
	// Assign timestamps to the returned account
	followedAccount.CreatedAt = createdAt.Format(time.RFC3339)
	if updatedAt.Valid {
		formattedUpdatedAt := updatedAt.Time.Format(time.RFC3339)
		followedAccount.UpdatedAt = &formattedUpdatedAt
	} else {
		followedAccount.UpdatedAt = nil
	}
	// --- End Fetch ---

	// Insert into follows table
	insertCtx, cancelInsert := context.WithTimeout(ctx, 5*time.Second)
	defer cancelInsert() // Ensure context is cancelled
	// Use parameter name directly
	_, err = db.ExecContext(insertCtx,
		`INSERT INTO follows (follower_user_id, followed_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		currentUserID, userIdToFollow)
	// Removed duplicate cancelInsert() call

	if err != nil {
		// Use parameter name directly
		log.Printf("FollowUser DB Error inserting follow (%s -> %s): %v", currentUserID, userIdToFollow, err)
		return nil, fmt.Errorf("failed to follow user") // Can mask internal errors
	}

	// Use parameter name directly
	log.Printf("User %s followed user %s", currentUserID, userIdToFollow)

	// **!! Add Notification Logic Here !!**
	// Similar to the RabbitMQ logic, perhaps in a goroutine:
	go func() {
		// Insert into notifications table
		// recipient_user_id = userIdToFollow
		// triggering_user_id = currentUserID
		// notification_type = 'new_follower'
		// entity_id = currentUserID (or null)
		// is_read = false
		notifCtx, notifCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer notifCancel()
		dbNotif, errDb := getDB()
		if errDb != nil {
			log.Printf("FollowUser Notification DB Error: %v", errDb)
			return
		}
		defer dbNotif.Close()
		_, errNotif := dbNotif.ExecContext(notifCtx, `
            INSERT INTO notifications (recipient_user_id, triggering_user_id, notification_type, entity_id)
            VALUES ($1, $2, 'new_follower', $3)
        `, userIdToFollow, currentUserID, currentUserID) // Using currentUserID as entity_id example

		if errNotif != nil {
			log.Printf("FollowUser: Failed to insert notification for %s: %v", userIdToFollow, errNotif)
		} else {
			log.Printf("FollowUser: Inserted 'new_follower' notification for %s triggered by %s", userIdToFollow, currentUserID)
		}
	}()

	return &followedAccount, nil // Return the account being followed
}

// UnfollowUser is the resolver for the unfollowUser field.
func (r *mutationResolver) UnfollowUser(ctx context.Context, userIdToUnfollow string) (*model.Account, error) {
	// ... (keep existing implementation)
	currentUserID, err := getCurrentUserID(ctx) // Uses helper from auth.go
	if err != nil {
		log.Printf("UnfollowUser Error: Not authenticated: %v", err)
		return nil, fmt.Errorf("authentication required")
	}

	db, err := getDB()
	if err != nil {
		log.Printf("UnfollowUser DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()

	// --- Fetch the account being unfollowed ---
	var unfollowedAccount model.Account
	var createdAt time.Time
	var updatedAt sql.NullTime
	queryCtx, cancelQuery := context.WithTimeout(ctx, 5*time.Second)
	defer cancelQuery() // Ensure context is cancelled
	// Use parameter name directly
	err = db.QueryRowContext(queryCtx,
		`SELECT id, email, first_name, last_name, address, phone, age, gender, created_at, updated_at
         FROM accounts WHERE id = $1`, userIdToUnfollow).Scan(
		&unfollowedAccount.AccountID, &unfollowedAccount.Email, &unfollowedAccount.FirstName, &unfollowedAccount.LastName,
		&unfollowedAccount.Address, &unfollowedAccount.Phone, &unfollowedAccount.Age, &unfollowedAccount.Gender,
		&createdAt, &updatedAt,
	)
	// Removed duplicate cancelQuery() call

	if err != nil {
		// Use parameter name directly
		log.Printf("UnfollowUser: Could not fetch unfollowed user %s, proceeding with delete attempt: %v", userIdToUnfollow, err)
		if err != sql.ErrNoRows { // Log unexpected errors
			// Use parameter name directly
			log.Printf("UnfollowUser DB Error querying unfollowed user %s: %v", userIdToUnfollow, err)
		}
		// Populate minimum required info for return if needed
		unfollowedAccount.AccountID = userIdToUnfollow // Use parameter name directly
	} else {
		// Assign timestamps if fetch was successful
		unfollowedAccount.CreatedAt = createdAt.Format(time.RFC3339)
		if updatedAt.Valid {
			formattedUpdatedAt := updatedAt.Time.Format(time.RFC3339)
			unfollowedAccount.UpdatedAt = &formattedUpdatedAt
		} else {
			unfollowedAccount.UpdatedAt = nil
		}
	}
	// --- End Fetch ---

	// Delete from follows table
	deleteCtx, cancelDelete := context.WithTimeout(ctx, 5*time.Second)
	defer cancelDelete() // Ensure context is cancelled
	// Use parameter name directly
	result, err := db.ExecContext(deleteCtx,
		`DELETE FROM follows WHERE follower_user_id = $1 AND followed_user_id = $2`,
		currentUserID, userIdToUnfollow)
	// Removed duplicate cancelDelete() call

	if err != nil {
		// Use parameter name directly
		log.Printf("UnfollowUser DB Error deleting follow (%s -> %s): %v", currentUserID, userIdToUnfollow, err)
		return nil, fmt.Errorf("failed to unfollow user")
	}

	rowsAffected, _ := result.RowsAffected()
	// Use parameter name directly
	log.Printf("User %s unfollowed user %s (Rows affected: %d)", currentUserID, userIdToUnfollow, rowsAffected)

	// Return the account being unfollowed
	return &unfollowedAccount, nil
}

// GetAccount is the resolver for the getAccount field.
func (r *queryResolver) GetAccount(ctx context.Context, accountID string) (*model.Account, error) {
	// ... (keep existing implementation)
	db, err := getDB()
	if err != nil {
		log.Printf("GetAccount DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()

	var account model.Account
	var createdAt time.Time
	var updatedAt sql.NullTime // Use sql.NullTime for nullable timestamp

	queryCtx, cancelQuery := context.WithTimeout(ctx, 5*time.Second)
	defer cancelQuery() // Ensure context is cancelled
	err = db.QueryRowContext(queryCtx,
		`SELECT id, email, first_name, last_name, address, phone, age, gender, created_at, updated_at
         FROM accounts WHERE id = $1`, accountID).Scan(
		&account.AccountID, &account.Email, &account.FirstName, &account.LastName,
		&account.Address, &account.Phone, &account.Age, &account.Gender,
		&createdAt, &updatedAt, // Scan into time.Time and sql.NullTime
	)
	// Removed duplicate cancelQuery() call

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("account not found")
		}
		log.Printf("GetAccount DB Error querying account %s: %v", accountID, err)
		return nil, fmt.Errorf("internal server error")
	}

	// Assign timestamps
	account.CreatedAt = createdAt.Format(time.RFC3339)
	if updatedAt.Valid {
		formattedUpdatedAt := updatedAt.Time.Format(time.RFC3339)
		account.UpdatedAt = &formattedUpdatedAt // Assign address of string if UpdatedAt is *string
	} else {
		account.UpdatedAt = nil
	}

	return &account, nil
}

// ListAccounts is the resolver for the listAccounts field.
func (r *queryResolver) ListAccounts(ctx context.Context) ([]*model.Account, error) {
	// ... (keep existing implementation)
	db, err := getDB()
	if err != nil {
		log.Printf("ListAccounts DB Error: %v", err)
		return nil, fmt.Errorf("internal server error")
	}
	defer db.Close()

	queryCtx, cancelQuery := context.WithTimeout(ctx, 10*time.Second)
	defer cancelQuery() // Ensure context is cancelled
	rows, err := db.QueryContext(queryCtx,
		`SELECT id, email, first_name, last_name, address, phone, age, gender, created_at, updated_at FROM accounts ORDER BY created_at DESC`,
	)
	// Removed duplicate cancelQuery() call

	if err != nil {
		log.Printf("ListAccounts DB Error querying: %v", err)
		return nil, fmt.Errorf("failed to list accounts")
	}
	defer rows.Close()

	accounts := []*model.Account{}
	for rows.Next() {
		var acc model.Account
		var createdAt time.Time
		var updatedAt sql.NullTime

		err := rows.Scan(
			&acc.AccountID, &acc.Email, &acc.FirstName, &acc.LastName,
			&acc.Address, &acc.Phone, &acc.Age, &acc.Gender,
			&createdAt, &updatedAt,
		)
		if err != nil {
			log.Printf("ListAccounts DB Error scanning row: %v", err)
			continue // Skip this account
		}

		acc.CreatedAt = createdAt.Format(time.RFC3339)
		if updatedAt.Valid {
			formattedUpdatedAt := updatedAt.Time.Format(time.RFC3339)
			acc.UpdatedAt = &formattedUpdatedAt
		} else {
			acc.UpdatedAt = nil
		}

		accounts = append(accounts, &acc)
	}

	if err = rows.Err(); err != nil {
		log.Printf("ListAccounts DB Error iterating rows: %v", err)
		return nil, fmt.Errorf("error reading accounts list")
	}

	return accounts, nil
}

// Ensure this function definition exists if your schema expects it.
// If user.resolvers.go is intended to implement the top-level Query and Mutation interfaces,
// these functions might belong in schema.resolvers.go instead, calling methods on 'r'.
// However, based on gqlgen.yml using follow-schema, they belong here.
// func (r *Resolver) Account() AccountResolver { return &accountResolver{r} } // If needed by gqlgen setup
