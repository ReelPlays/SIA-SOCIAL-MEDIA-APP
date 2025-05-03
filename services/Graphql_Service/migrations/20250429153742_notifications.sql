-- +goose Up
-- +goose StatementBegin
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- The user receiving
    triggering_user_id UUID REFERENCES accounts(id) ON DELETE SET NULL,       -- The user who caused it (post author)
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('new_post', 'new_comment', 'like')), -- Example types
    entity_id UUID,                                                       -- ID of the post
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE notifications;
-- +goose StatementEnd
