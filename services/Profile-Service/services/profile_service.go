package services

import (
	"profile-service/models"
	"profile-service/repositories"

	"golang.org/x/crypto/bcrypt"
)

type ProfileService struct {
	repo *repositories.ProfileRepository
}

func NewProfileService(repo *repositories.ProfileRepository) *ProfileService {
	return &ProfileService{repo: repo}
}

func (s *ProfileService) CreateProfile(profile *models.Profile) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(profile.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	profile.Password = string(hashedPassword)
	return s.repo.Create(profile)
}

func (s *ProfileService) GetProfile(id int64) (*models.Profile, error) {
	return s.repo.GetByID(id)
}
