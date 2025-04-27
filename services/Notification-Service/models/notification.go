package models

import "time"

// NotificationType represents different types of notifications
type NotificationType string

const (
	LikeNotification     NotificationType = "like"
	CommentNotification  NotificationType = "comment"
	FollowNotification   NotificationType = "follow"
	MentionNotification  NotificationType = "mention"
	MessageNotification  NotificationType = "message"
	SystemNotification   NotificationType = "system"
)

// Notification represents a notification entity
type Notification struct {
	ID          int64           `json:"id"`
	UserID      string          `json:"user_id"`
	SenderID    string          `json:"sender_id,omitempty"`
	Type        NotificationType `json:"type"`
	Content     string          `json:"content"`
	ResourceID  string          `json:"resource_id,omitempty"`
	ResourceURL string          `json:"resource_url,omitempty"`
	IsRead      bool            `json:"is_read"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}