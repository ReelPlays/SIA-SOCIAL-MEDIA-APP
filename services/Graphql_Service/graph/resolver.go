package graph

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	DB *sql.DB
}

// Initialize a new database connection
func NewResolver() *Resolver {
	connStr := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	return &Resolver{DB: db}
}
