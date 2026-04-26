-- name: GetUserScoutSettings :one
SELECT * FROM user_scout_settings WHERE user_id = $1;

-- name: UpsertUserScoutSettings :one
INSERT INTO user_scout_settings (user_id, accepting_scouts)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
SET accepting_scouts = $2, updated_at = NOW()
RETURNING *;
