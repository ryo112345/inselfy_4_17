CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$'),
    CONSTRAINT users_name_length CHECK (char_length(name) BETWEEN 1 AND 100)
);

CREATE INDEX idx_users_username ON users(username);
