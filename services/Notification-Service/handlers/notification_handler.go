package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"c:/Users/CD/Documents/SIA-SOCIAL-MEDIA-APP/services/Notification-Service/models"
	"c:/Users/CD/Documents/SIA-SOCIAL-MEDIA-APP/services/Notification-Service/services"

	"github.com/gorilla/mux"
)

// NotificationHandler handles HTTP requests for notifications
type NotificationHandler struct {
	service *services.NotificationService
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(service *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{service: service}
}

// RegisterRoutes registers the routes for the notification handler
func (h *NotificationHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/notifications", h.CreateNotification).Methods("POST")
	router.HandleFunc("/notifications/user/{userID}", h.GetUserNotifications).Methods("GET")
	router.HandleFunc("/notifications/{id}/read", h.MarkAsRead).Methods("PUT")
	router.HandleFunc("/notifications/user/{userID}/read-all", h.MarkAllAsRead).Methods("PUT")
	router.HandleFunc("/notifications/{id}", h.DeleteNotification).Methods("DELETE")
}

// CreateNotification handles the creation of a new notification
func (h *NotificationHandler) CreateNotification(w http.ResponseWriter, r *http.Request) {
	var notification models.Notification
	if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.service.CreateNotification(&notification); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(notification)
}

// GetUserNotifications retrieves all notifications for a user
func (h *NotificationHandler) GetUserNotifications(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["userID"]

	notifications, err := h.service.GetUserNotifications(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// MarkAsRead marks a notification as read
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	if err := h.service.MarkAsRead(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// MarkAllAsRead marks all notifications for a user as read
func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["userID"]

	if err := h.service.MarkAllAsRead(userID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteNotification deletes a notification
func (h *NotificationHandler) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.ParseInt(vars["id"], 10, 64)
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	if err := h.service.DeleteNotification(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}