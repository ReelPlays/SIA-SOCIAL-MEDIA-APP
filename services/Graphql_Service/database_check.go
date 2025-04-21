package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env file
	err := godotenv.Load("c:\\Users\\KEITH\\ProjectSIA\\.env")
	if err != nil {
		log.Fatalf("Error loading .env file")
	}

	connStr := os.Getenv("USER_TABLE_DB")
	fmt.Println("Connection String:", connStr) // Debugging line

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("failed to connect to the database: %v", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatalf("failed to ping the database: %v", err)
	}

	fmt.Println("Successfully connected to the database!")
}
