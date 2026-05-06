-- name: CreateConversationParticipant :exec
INSERT INTO conversation_participants (conversation_id, participant_type, participant_id)
VALUES ($1, $2, $3)
ON CONFLICT (conversation_id, participant_type, participant_id) DO NOTHING;

-- name: GetConversationParticipant :one
SELECT * FROM conversation_participants
WHERE conversation_id = $1 AND participant_type = $2 AND participant_id = $3;

-- name: UpdateParticipantLastReadAt :exec
UPDATE conversation_participants
SET last_read_at = NOW()
WHERE conversation_id = $1 AND participant_type = $2 AND participant_id = $3;

-- name: ListParticipantsByConversation :many
SELECT * FROM conversation_participants
WHERE conversation_id = $1;
