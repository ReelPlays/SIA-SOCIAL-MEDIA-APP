-- +goose Up
-- +goose StatementBegin
-- Table to track who follows whom
CREATE TABLE follows (
    follow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- User doing the following
    followed_user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- User being followed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (follower_user_id, followed_user_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE follows;
-- +goose StatementEnd
