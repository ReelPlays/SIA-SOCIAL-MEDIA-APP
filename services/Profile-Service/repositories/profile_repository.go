package repositories

import (
    "database/sql"
    "profile-service/models"
)

type ProfileRepository struct {
    db *sql.DB
}

func NewProfileRepository(db *sql.DB) *ProfileRepository {
    return &ProfileRepository{db: db}
}

func (r *ProfileRepository) Create(profile *models.Profile) error {
    query := `
        INSERT INTO profiles (username, email, password, first_name, middle_name,
        last_name, bio, profile_picture_url, banner_picture_url, date_of_birth, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING profile_id`

    return r.db.QueryRow(
        query,
        profile.Username,
        profile.Email,
        profile.Password,
        profile.FirstName,
        profile.MiddleName,
        profile.LastName,
        profile.Bio,
        profile.ProfilePicURL,
        profile.BannerPicURL,
        profile.DateOfBirth,
        profile.Address,
    ).Scan(&profile.ProfileID)
}

func (r *ProfileRepository) GetByID(id int64) (*models.Profile, error) {
    profile := &models.Profile{}
    query := `SELECT * FROM profiles WHERE profile_id = $1`
    err := r.db.QueryRow(query, id).Scan(
        &profile.ProfileID,
        &profile.Username,
        &profile.Email,
        &profile.Password,
        &profile.FirstName,
        &profile.MiddleName,
        &profile.LastName,
        &profile.Bio,
        &profile.ProfilePicURL,
        &profile.BannerPicURL,
        &profile.DateOfBirth,
        &profile.Address,
    )
    if err != nil {
        return nil, err
    }
    return profile, nil
}