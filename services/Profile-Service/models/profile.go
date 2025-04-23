package models

import "time"

type Profile struct {
    ProfileID       int64     `json:"profile_id"`
    Username        string    `json:"username"`
    Email           string    `json:"email"`
    Password        string    `json:"-"`
    FirstName       string    `json:"first_name"`
    MiddleName      string    `json:"middle_name"`
    LastName        string    `json:"last_name"`
    Bio             string    `json:"bio"`
    ProfilePicURL   string    `json:"profile_picture_url"`
    BannerPicURL    string    `json:"banner_picture_url"`
    DateOfBirth     time.Time `json:"date_of_birth"`
    Address         string    `json:"address"`
}