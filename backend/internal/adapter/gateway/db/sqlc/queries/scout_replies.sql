-- name: CreateScoutReply :one
INSERT INTO scout_replies (scout_message_id, sender_type, sender_id, body)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListScoutRepliesByMessageID :many
SELECT * FROM scout_replies
WHERE scout_message_id = $1
ORDER BY created_at ASC;
