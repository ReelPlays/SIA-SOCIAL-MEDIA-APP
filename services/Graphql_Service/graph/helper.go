package graph

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

// getDB establishes a connection to the database and returns a *sql.DB instance
func getDB() (*sql.DB, error) {
	connStr := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	return db, nil
}
