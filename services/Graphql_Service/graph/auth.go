package graph

import (
	"context"
	"fmt"
)

// ContextKey defines a type for context keys to avoid collisions.
type ContextKey string

// !!! IMPORTANT: Replace "authUserID" with the actual key your auth middleware uses !!!
const AuthUserIDKey ContextKey = "authUserID"

// getCurrentUserID retrieves the authenticated user ID from the context.
// Returns an error if the ID is not found or not of the expected type (string).
// ADAPT THIS FUNCTION BASED ON YOUR ACTUAL AUTHENTICATION SETUP.
func getCurrentUserID(ctx context.Context) (string, error) {
	userIDValue := ctx.Value(AuthUserIDKey)
	if userIDValue == nil {
		return "", fmt.Errorf("authentication required: User ID not found in context (key: %s)", AuthUserIDKey)
	}

	userID, ok := userIDValue.(string)
	if !ok {
		return "", fmt.Errorf("authentication error: User ID in context (key: %s) is not a string", AuthUserIDKey)
	}

	if userID == "" {
		return "", fmt.Errorf("authentication error: User ID in context is empty")
	}

	return userID, nil
}
