-- name: CreateUser :one
INSERT INTO users (username, name)
VALUES ($1, $2)
RETURNING *;

-- name: CreateUserWithOAuth :one
INSERT INTO users (username, name, email, oauth_provider, oauth_provider_id, avatar_url)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetUserByOAuthProvider :one
SELECT *
FROM users
WHERE oauth_provider = $1 AND oauth_provider_id = $2;

-- name: GetUserByUsername :one
SELECT *
FROM users
WHERE username = $1;

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = $1;

-- name: ListUsers :many
SELECT id, username, name, email, avatar_url, created_at
FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountUsers :one
SELECT count(*) FROM users;

-- name: SearchUsers :many
SELECT id, username, name, email, avatar_url, created_at
FROM users
WHERE username ILIKE '%' || $1 || '%'
   OR name ILIKE '%' || $1 || '%'
   OR email::text ILIKE '%' || $1 || '%'
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountSearchUsers :one
SELECT count(*)
FROM users
WHERE username ILIKE '%' || $1 || '%'
   OR name ILIKE '%' || $1 || '%'
   OR email::text ILIKE '%' || $1 || '%';

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: UpdateUserProfile :one
UPDATE users
SET
    username = COALESCE(sqlc.narg('username'), username),
    name = COALESCE(sqlc.narg('name'), name),
    headline = CASE WHEN sqlc.arg('headline_set')::bool THEN sqlc.narg('headline') ELSE headline END,
    location = CASE WHEN sqlc.arg('location_set')::bool THEN sqlc.narg('location') ELSE location END,
    about = CASE WHEN sqlc.arg('about_set')::bool THEN sqlc.narg('about') ELSE about END,
    industry = CASE WHEN sqlc.arg('industry_set')::bool THEN sqlc.narg('industry') ELSE industry END,
    job_type = CASE WHEN sqlc.arg('job_type_set')::bool THEN sqlc.narg('job_type') ELSE job_type END,
    job_seeking_status = CASE WHEN sqlc.arg('job_seeking_status_set')::bool THEN sqlc.narg('job_seeking_status') ELSE job_seeking_status END,
    profile_color = CASE WHEN sqlc.arg('profile_color_set')::bool THEN sqlc.narg('profile_color') ELSE profile_color END,
    avatar_url = CASE WHEN sqlc.arg('avatar_url_set')::bool THEN sqlc.narg('avatar_url') ELSE avatar_url END,
    cover_photo_url = CASE WHEN sqlc.arg('cover_photo_url_set')::bool THEN sqlc.narg('cover_photo_url') ELSE cover_photo_url END,
    is_public = COALESCE(sqlc.narg('is_public'), is_public),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;
