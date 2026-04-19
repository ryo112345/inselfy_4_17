-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3);

-- name: GetRefreshTokenByHash :one
SELECT *
FROM refresh_tokens
WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW();

-- name: RevokeRefreshTokensByUserID :exec
UPDATE refresh_tokens SET revoked_at = NOW()
WHERE user_id = $1 AND revoked_at IS NULL;
