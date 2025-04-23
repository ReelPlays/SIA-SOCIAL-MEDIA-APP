package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "profile-service/models"
    "profile-service/services"
    "github.com/gorilla/mux"
)

type ProfileHandler struct {
    service *services.ProfileService
}

func NewProfileHandler(service *services.ProfileService) *ProfileHandler {
    return &ProfileHandler{service: service}
}

func (h *ProfileHandler) CreateProfile(w http.ResponseWriter, r *http.Request) {
    var profile models.Profile
    if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    if err := h.service.CreateProfile(&profile); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(profile)
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.ParseInt(vars["id"], 10, 64)
    if err != nil {
        http.Error(w, "Invalid profile ID", http.StatusBadRequest)
        return
    }

    profile, err := h.service.GetProfile(id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    json.NewEncoder(w).Encode(profile)
}