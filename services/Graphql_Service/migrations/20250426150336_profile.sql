-- +goose Up
-- +goose StatementBegin
CREATE TABLE profiles (
    profile_id UUID PRIMARY KEY, -- Match the UUID type from accounts.id
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    middle_name VARCHAR(50),
    last_name VARCHAR(50),
    bio TEXT,
    profile_picture_url VARCHAR(255),
    banner_picture_url VARCHAR(255),
    date_of_birth DATE,
    address VARCHAR(100),
    CONSTRAINT fk_profile_account FOREIGN KEY (profile_id) REFERENCES accounts(id) ON DELETE CASCADE
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE profiles;
-- +goose StatementEnd
