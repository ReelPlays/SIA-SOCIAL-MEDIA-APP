package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	"github.com/rs/cors"
	
	"notification-service/handlers"
	"notification-service/repositories"
	"notification-service/services"
)

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	// Get database connection details
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}
	
	dbPassword := os.Getenv("DB_PASSWORD")
	
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "sia_social_media"
	}
	
	// Get service port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082" // Default port for notification service
	}

	// Connect to PostgreSQL database
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)
	
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	
	// Test database connection
	err = db.Ping()
	if err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	
	log.Println("Successfully connected to PostgreSQL database")

	// Create router
	router := mux.NewRouter()

	// Initialize repositories, services, and handlers
	notificationRepo := repositories.NewNotificationRepository(db)
	notificationService := services.NewNotificationService(notificationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationService)

	// Register routes
	notificationHandler.RegisterRoutes(router)

	// Add CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	// Start server
	fmt.Printf("Notification Service running on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, c.Handler(router)))
}