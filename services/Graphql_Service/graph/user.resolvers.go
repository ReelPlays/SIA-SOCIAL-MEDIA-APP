package graph

import (
	"context"
	"database/sql"
	"fmt"
	"graphql/graph/model"
	"log"
	"os"

	_ "github.com/lib/pq"
)

// Register is the resolver for the register field.
func (r *mutationResolver) Register(ctx context.Context, input model.RegisterInput) (*model.Account, error) {
	// Connect to the database
	connStr := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("failed to connect to the database: %v", err)
		return nil, fmt.Errorf("internal error")
	}
	defer db.Close()

	// Insert the new account into the database
	var accountID string
	err = db.QueryRowContext(ctx, `
		INSERT INTO accounts (email, password, first_name, last_name, address, phone, age, gender, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		RETURNING id
	`, input.Email, input.Password, input.FirstName, input.LastName, input.Address, input.Phone, input.Age, input.Gender).Scan(&accountID)
	if err != nil {
		log.Printf("failed to insert account: %v", err)
		return nil, fmt.Errorf("internal error")
	}

	// Return the created account
	return &model.Account{
		AccountID: accountID, // Corrected field name
		Email:     input.Email,
		FirstName: input.FirstName,
		LastName:  input.LastName,
		Address:   input.Address,
		Phone:     input.Phone,
		Age:       input.Age,
		Gender:    input.Gender,
		CreatedAt: "now", // Replace with actual timestamp if needed
	}, nil
}

// GetAccount is the resolver for the getAccount field.
func (r *queryResolver) GetAccount(ctx context.Context, accountID string) (*model.Account, error) {
	panic(fmt.Errorf("not implemented: GetAccount - getAccount"))
}

// ListAccounts is the resolver for the listAccounts field.
func (r *queryResolver) ListAccounts(ctx context.Context) ([]*model.Account, error) {
	panic(fmt.Errorf("not implemented: ListAccounts - listAccounts"))
}

// !!! WARNING !!!
// The code below was going to be deleted when updating resolvers. It has been copied here so you have
// one last chance to move it out of harms way if you want. There are two reasons this happens:
//  - When renaming or deleting a resolver the old code will be put in here. You can safely delete
//    it when you're done.
//  - You have helper methods in this file. Move them out to keep these resolver files clean.
/*
	func (r *mutationResolver) Login(ctx context.Context, input model.LoginInput) (*model.AuthResponse, error) {
	panic(fmt.Errorf("not implemented: Login - login"))
}
*/
