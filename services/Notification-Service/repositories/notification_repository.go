package repositories

import (
	"database/sql"
	"time"

	"c:/Users/CD/Documents/SIA-SOCIAL-MEDIA-APP/services/Notification-Service/models"
)

// NotificationRepository handles database operations for notifications
type NotificationRepository struct {
	db *sql.DB
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// Create adds a new notification to the database
func (r *NotificationRepository) Create(notification *models.Notification) error {
	query := `
		INSERT INTO notifications (user_id, sender_id, type, content, resource_id, resource_url, is_read, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`
	
	now := time.Now()
	notification.CreatedAt = now
	notification.UpdatedAt = now
	notification.IsRead = false
	
	return r.db.QueryRow(
		query,
		notification.UserID,
		notification.SenderID,
		notification.Type,
		notification.Content,
		notification.ResourceID,
		notification.ResourceURL,
		notification.IsRead,
		notification.CreatedAt,
		notification.UpdatedAt,
	).Scan(&notification.ID)
}

// GetByUserID retrieves all notifications for a specific user
func (r *NotificationRepository) GetByUserID(userID string) ([]models.Notification, error) {
	query := `
		SELECT id, user_id, sender_id, type, content, resource_id, resource_url, is_read, created_at, updated_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var notifications []models.Notification
	for rows.Next() {
		var notification models.Notification
		if err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.SenderID,
			&notification.Type,
			&notification.Content,
			&notification.ResourceID,
			&notification.ResourceURL,
			&notification.IsRead,
			&notification.CreatedAt,
			&notification.UpdatedAt,
		); err != nil {
			return nil, err
		}
		notifications = append(notifications, notification)
	}
	
	return notifications, nil
}

// MarkAsRead marks a notification as read
func (r *NotificationRepository) MarkAsRead(id int64) error {
	query := `
		UPDATE notifications
		SET is_read = true, updated_at = $1
		WHERE id = $2
	`
	
	_, err := r.db.Exec(query, time.Now(), id)
	return err
}

// MarkAllAsRead marks all notifications for a user as read
func (r *NotificationRepository) MarkAllAsRead(userID string) error {
	query := `
		UPDATE notifications
		SET is_read = true, updated_at = $1
		WHERE user_id = $2 AND is_read = false
	`
	
	_, err := r.db.Exec(query, time.Now(), userID)
	return err
}

// DeleteNotification deletes a notification
func (r *NotificationRepository) DeleteNotification(id int64) error {
	query := `DELETE FROM notifications WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}