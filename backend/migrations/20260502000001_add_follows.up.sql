CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT follows_no_self CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_following_id ON follows(following_id);

ALTER TABLE users
    ADD COLUMN followers_count INT NOT NULL DEFAULT 0,
    ADD COLUMN following_count INT NOT NULL DEFAULT 0;
