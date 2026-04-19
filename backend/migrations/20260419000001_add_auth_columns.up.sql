ALTER TABLE users
  ADD COLUMN email TEXT UNIQUE,
  ADD COLUMN oauth_provider TEXT,
  ADD COLUMN oauth_provider_id TEXT,
  ADD COLUMN avatar_url TEXT;

CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id)
  WHERE oauth_provider IS NOT NULL;

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
