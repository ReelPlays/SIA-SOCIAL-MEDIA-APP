package services

import (
	"c:/Users/CD/Documents/SIA-SOCIAL-MEDIA-APP/services/Notification-Service/models"
	"c:/Users/CD/Documents/SIA-SOCIAL-MEDIA-APP/services/Notification-Service/repositories"
)

// NotificationService handles business logic for notifications
type NotificationService struct {
	repo *repositories.NotificationRepository
}

// NewNotificationService creates a new notification service
func NewNotificationService(repo *repositories.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

// CreateNotification creates a new notification
func (s *NotificationService) CreateNotification(notification *models.Notification) error {
	return s.repo.Create(notification)
}

// GetUserNotifications retrieves all notifications for a user
func (s *NotificationService) GetUserNotifications(userID string) ([]models.Notification, error) {
	return s.repo.GetByUserID(userID)
}

// MarkAsRead marks a notification as read
func (s *NotificationService) MarkAsRead(id int64) error {
	return s.repo.MarkAsRead(id)
}

// MarkAllAsRead marks all notifications for a user as read
func (s *NotificationService) MarkAllAsRead(userID string) error {
	return s.repo.MarkAllAsRead(userID)
}

// DeleteNotification deletes a notification
func (s *NotificationService) DeleteNotification(id int64) error {
	return s.repo.DeleteNotification(id)
}