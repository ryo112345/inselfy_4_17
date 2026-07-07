-- name: CreateAdmin :one
INSERT INTO admins (email, name)
VALUES ($1, $2)
RETURNING *;

-- name: SeedAdmin :exec
INSERT INTO admins (email, name)
VALUES ($1, $2)
ON CONFLICT (email) DO NOTHING;

-- name: ListAdmins :many
SELECT *
FROM admins
ORDER BY created_at ASC;

-- name: GetAdminByAPIKeyHash :one
SELECT *
FROM admins
WHERE api_key_hash = $1;

-- name: SetAdminAPIKey :one
UPDATE admins
SET api_key_hash = $2, api_key_prefix = $3, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: TouchAdminLastUsed :exec
UPDATE admins
SET last_used_at = NOW()
WHERE id = $1;

-- name: DeleteAdmin :exec
DELETE FROM admins
WHERE id = $1;

-- name: CountAdmins :one
SELECT COUNT(*) FROM admins;
