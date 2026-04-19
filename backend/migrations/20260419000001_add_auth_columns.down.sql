DROP TABLE IF EXISTS refresh_tokens;

DROP INDEX IF EXISTS idx_users_oauth;

ALTER TABLE users
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS oauth_provider_id,
  DROP COLUMN IF EXISTS oauth_provider,
  DROP COLUMN IF EXISTS email;
