CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    api_key_hash TEXT UNIQUE,
    api_key_prefix TEXT,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admins_email_length CHECK (char_length(email) BETWEEN 3 AND 255),
    CONSTRAINT admins_name_length CHECK (char_length(name) <= 100)
);

CREATE INDEX idx_admins_api_key_hash ON admins(api_key_hash);
