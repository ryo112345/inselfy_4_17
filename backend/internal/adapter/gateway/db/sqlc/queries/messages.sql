-- name: CreateMessage :one
INSERT INTO messages (conversation_id, sender_type, sender_id, body, message_type, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListMessagesByConversationID :many
SELECT * FROM messages
WHERE conversation_id = $1
ORDER BY created_at ASC
LIMIT $2 OFFSET $3;

-- name: CountMessagesByConversationID :one
SELECT count(*) FROM messages WHERE conversation_id = $1;
