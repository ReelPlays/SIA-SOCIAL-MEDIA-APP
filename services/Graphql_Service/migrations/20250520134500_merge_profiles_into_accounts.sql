-- +goose Up
-- +goose StatementBegin
-- Add missing profile fields to accounts table
ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS middle_name VARCHAR(50),
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS banner_picture_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Migrate existing profile data to accounts
UPDATE accounts
SET 
    username = p.username,
    middle_name = p.middle_name,
    bio = p.bio,
    profile_picture_url = p.profile_picture_url,
    banner_picture_url = p.banner_picture_url,
    date_of_birth = p.date_of_birth
FROM profiles p
WHERE accounts.id = p.profile_id;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Remove the added columns if needed to rollback
ALTER TABLE accounts
    DROP COLUMN IF EXISTS username,
    DROP COLUMN IF EXISTS middle_name,
    DROP COLUMN IF EXISTS bio,
    DROP COLUMN IF EXISTS profile_picture_url,
    DROP COLUMN IF EXISTS banner_picture_url,
    DROP COLUMN IF EXISTS date_of_birth;
-- +goose StatementEnd