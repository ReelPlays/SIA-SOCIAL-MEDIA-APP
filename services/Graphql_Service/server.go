package main

import (
	"context" // Import context package
	"fmt"     // Import fmt for errors
	"graphql/graph"
	"log"
	"net/http"
	"os"
	"strings" // Import strings package

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/golang-jwt/jwt/v5" // Import JWT library
	"github.com/joho/godotenv"
	"github.com/rs/cors" // Import CORS package
	"github.com/vektah/gqlparser/v2/ast"
)

const defaultPort = "8080"

// --- Define your frontend origin ---
const frontendOrigin = "http://localhost:5173" // Adjust if your frontend runs on a different port

// --- Authentication Middleware ---
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("AuthMiddleware: Entered")
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Println("AuthMiddleware: No Authorization header found")
			next.ServeHTTP(w, r)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			log.Println("AuthMiddleware: Malformed Authorization header")
			next.ServeHTTP(w, r)
			return
		}

		tokenString := parts[1]
		jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")

		// !!! TEMPORARY DEBUG LOG - REMOVE AFTER TESTING !!!
		log.Printf("AuthMiddleware: Using JWT Secret from env: [%s]", jwtSecret)
		// !!! END TEMPORARY DEBUG LOG !!!

		if jwtSecret == "" {
			log.Println("AuthMiddleware: Error - SUPABASE_JWT_SECRET environment variable not set")
			http.Error(w, "Internal server configuration error", http.StatusInternalServerError)
			return
		}

		// Parse and validate the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			log.Printf("AuthMiddleware: Token parsing/validation error: %v", err)
			next.ServeHTTP(w, r)
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			log.Println("AuthMiddleware: Token claims are valid map claims and token is valid.")
			userID, userIDOk := claims["sub"].(string)
			log.Printf("AuthMiddleware: Parsed claims, sub raw value: %v, extracted as string ok: %v", claims["sub"], userIDOk)

			if !userIDOk || userID == "" {
				log.Println("AuthMiddleware: Invalid or missing 'sub' (user ID) claim in token")
				next.ServeHTTP(w, r)
				return
			}

			log.Printf("AuthMiddleware: Extracted UserID: [%s]. Adding to context with key [%s].", userID, graph.AuthUserIDKey)
			ctxWithUser := context.WithValue(r.Context(), graph.AuthUserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctxWithUser))
		} else {
			log.Printf("AuthMiddleware: Token claims NOT ok OR token is NOT valid (ok: %v, valid: %v)", ok, token.Valid)
			next.ServeHTTP(w, r)
		}
	})
}

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Error loading .env file", err)
	}

	// Ensure JWT secret is loaded
	if os.Getenv("SUPABASE_JWT_SECRET") == "" {
		log.Fatal("FATAL: SUPABASE_JWT_SECRET environment variable not set. Server cannot validate authentication.")
	}
	// Optional: Log another env var to check .env loading
	log.Printf("DEBUG: PORT from env: [%s]", os.Getenv("PORT"))

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	// --- Configure GraphQL server --- (rest is same as before)
	srv := handler.New(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{}}))
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))
	srv.Use(extension.Introspection{})
	srv.Use(extension.AutomaticPersistedQuery{
		Cache: lru.New[string](100),
	})

	// --- CORS Configuration --- (same as before)
	c := cors.New(cors.Options{
		AllowedOrigins: []string{frontendOrigin},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type", "X-Apollo-Operation-Name"},
		Debug:          true,
	})

	// --- Setup Routes and Middleware --- (same as before)
	mux := http.NewServeMux()
	queryHandler := c.Handler(AuthMiddleware(srv))
	mux.Handle("/query", queryHandler)
	mux.Handle("/", playground.Handler("GraphQL playground", "/query"))

	// --- Start server --- (same as before)
	log.Printf("GraphQL playground available at http://localhost:%s/", port)
	log.Printf("Accepting GraphQL requests at http://localhost:%s/query", port)
	log.Printf("Allowing CORS requests from: %s", frontendOrigin)
	log.Printf("Server starting on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
