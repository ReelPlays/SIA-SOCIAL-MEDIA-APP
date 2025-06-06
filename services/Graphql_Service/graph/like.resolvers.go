package graph

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.
// Code generated by github.com/99designs/gqlgen version v0.17.73

import (
	"context"
	"fmt"
	"log"
	"time"
)

// LikePost resolver - likes a post
func (r *mutationResolver) LikePost(ctx context.Context, postID string) (bool, error) {
	// Get the current user ID
	currentUserID, err := getCurrentUserID(ctx)
	if err != nil {
		log.Printf("LikePost Error: Not authenticated: %v", err)
		return false, fmt.Errorf("authentication required")
	}

	db, err := getDB()
	if err != nil {
		log.Printf("LikePost DB Error: %v", err)
		return false, fmt.Errorf("internal server error")
	}
	defer db.Close()

	// First verify that the post exists
	var postExists bool
	verifyCtx, cancelVerify := context.WithTimeout(ctx, 5*time.Second)
	defer cancelVerify()
	err = db.QueryRowContext(verifyCtx, "SELECT EXISTS(SELECT 1 FROM posts WHERE post_id = $1)", postID).Scan(&postExists)
	if err != nil {
		log.Printf("LikePost DB Error verifying post: %v", err)
		return false, fmt.Errorf("internal server error")
	}

	if !postExists {
		return false, fmt.Errorf("post not found")
	}

	// Try to insert a like (will fail gracefully if already liked due to unique constraint)
	insertCtx, cancelInsert := context.WithTimeout(ctx, 5*time.Second)
	defer cancelInsert()
	_, err = db.ExecContext(insertCtx,
		"INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT (post_id, user_id) DO NOTHING",
		postID, currentUserID)

	if err != nil {
		log.Printf("LikePost DB Error: %v", err)
		return false, fmt.Errorf("failed to like post")
	}

	// Check if a like was actually inserted (not already liked)
	var isLiked bool
	checkCtx, cancelCheck := context.WithTimeout(ctx, 5*time.Second)
	defer cancelCheck()
	err = db.QueryRowContext(checkCtx, "SELECT EXISTS(SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2)",
		postID, currentUserID).Scan(&isLiked)

	if err != nil {
		log.Printf("LikePost DB Error checking like: %v", err)
		return false, nil
	}

	// Create notification for post author if the post was successfully liked
	// and the liker is not the author
	if isLiked {
		go func(postID string, userID string) {
			notifCtx, notifCancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer notifCancel()

			dbNotif, errDb := getDB()
			if errDb != nil {
				log.Printf("LikePost Notification DB Error: %v", errDb)
				return
			}
			defer dbNotif.Close()

			// Get post author ID
			var postAuthorID string
			err := dbNotif.QueryRowContext(notifCtx, "SELECT author_id FROM posts WHERE post_id = $1", postID).Scan(&postAuthorID)
			if err != nil {
				log.Printf("LikePost Error getting post author: %v", err)
				return
			}

			// Only create notification if the post author is not the liker
			if postAuthorID != userID {
				_, err = dbNotif.ExecContext(notifCtx,
					`INSERT INTO notifications (recipient_user_id, triggering_user_id, notification_type, entity_id, is_read, created_at) 
                    VALUES ($1, $2, $3, $4, $5, NOW())`,
					postAuthorID, userID, "like", postID, false)

				if err != nil {
					log.Printf("LikePost Notification Error: %v", err)
				}
			}
		}(postID, currentUserID)
	}

	return true, nil
}

// UnlikePost resolver - unlikes a post
func (r *mutationResolver) UnlikePost(ctx context.Context, postID string) (bool, error) {
	// Get the current user ID
	currentUserID, err := getCurrentUserID(ctx)
	if err != nil {
		log.Printf("UnlikePost Error: Not authenticated: %v", err)
		return false, fmt.Errorf("authentication required")
	}

	db, err := getDB()
	if err != nil {
		log.Printf("UnlikePost DB Error: %v", err)
		return false, fmt.Errorf("internal server error")
	}
	defer db.Close()

	// Delete the like
	deleteCtx, cancelDelete := context.WithTimeout(ctx, 5*time.Second)
	defer cancelDelete()
	result, err := db.ExecContext(deleteCtx,
		"DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
		postID, currentUserID)

	if err != nil {
		log.Printf("UnlikePost DB Error: %v", err)
		return false, fmt.Errorf("failed to unlike post")
	}

	// Check if a like was actually removed
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("UnlikePost Error checking rows affected: %v", err)
		return false, nil
	}

	// Optionally clean up any related notifications
	if rowsAffected > 0 {
		go func(postID string, userID string) {
			notifCtx, notifCancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer notifCancel()

			dbNotif, errDb := getDB()
			if errDb != nil {
				log.Printf("UnlikePost Notification Cleanup DB Error: %v", errDb)
				return
			}
			defer dbNotif.Close()

			// Get post author ID
			var postAuthorID string
			err := dbNotif.QueryRowContext(notifCtx, "SELECT author_id FROM posts WHERE post_id = $1", postID).Scan(&postAuthorID)
			if err != nil {
				log.Printf("UnlikePost Error getting post author: %v", err)
				return
			}

			// Clean up notification if post author is not the unliker
			if postAuthorID != userID {
				_, err = dbNotif.ExecContext(notifCtx,
					`DELETE FROM notifications WHERE 
                    recipient_user_id = $1 AND 
                    triggering_user_id = $2 AND 
                    notification_type = 'like' AND 
                    entity_id = $3`,
					postAuthorID, userID, postID)

				if err != nil {
					log.Printf("UnlikePost Notification Cleanup Error: %v", err)
				}
			}
		}(postID, currentUserID)
	}

	return rowsAffected > 0, nil
}
