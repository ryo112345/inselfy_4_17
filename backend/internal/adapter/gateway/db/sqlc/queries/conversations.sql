-- name: CreateConversation :one
INSERT INTO conversations (company_id, candidate_id)
VALUES ($1, $2)
RETURNING *;

-- name: GetConversationByID :one
SELECT c.*,
    ca.company_name,
    u.name AS candidate_name
FROM conversations c
JOIN company_accounts ca ON ca.id = c.company_id
JOIN users u ON u.id = c.candidate_id
WHERE c.id = $1;

-- name: GetConversationByCompanyAndCandidate :one
SELECT * FROM conversations
WHERE company_id = $1 AND candidate_id = $2;

-- name: ListConversationsByCandidate :many
SELECT c.*,
    ca.company_name,
    u.name AS candidate_name,
    (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_body,
    (SELECT count(*)
     FROM messages m2
     JOIN conversation_participants cp ON cp.conversation_id = c.id
         AND cp.participant_type = 'candidate' AND cp.participant_id = c.candidate_id
     WHERE m2.conversation_id = c.id AND m2.created_at > cp.last_read_at AND m2.sender_type != 'candidate'
    )::int AS unread_count
FROM conversations c
JOIN company_accounts ca ON ca.id = c.company_id
JOIN users u ON u.id = c.candidate_id
WHERE c.candidate_id = $1
ORDER BY c.last_message_at DESC
LIMIT $2 OFFSET $3;

-- name: CountConversationsByCandidate :one
SELECT count(*) FROM conversations WHERE candidate_id = $1;

-- name: ListConversationsByCompany :many
SELECT c.*,
    ca.company_name,
    u.name AS candidate_name,
    (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_body,
    (SELECT count(*)
     FROM messages m2
     JOIN conversation_participants cp ON cp.conversation_id = c.id
         AND cp.participant_type = 'company' AND cp.participant_id = c.company_id
     WHERE m2.conversation_id = c.id AND m2.created_at > cp.last_read_at AND m2.sender_type != 'company'
    )::int AS unread_count
FROM conversations c
JOIN company_accounts ca ON ca.id = c.company_id
JOIN users u ON u.id = c.candidate_id
WHERE c.company_id = $1
ORDER BY c.last_message_at DESC
LIMIT $2 OFFSET $3;

-- name: CountConversationsByCompany :one
SELECT count(*) FROM conversations WHERE company_id = $1;

-- name: UpdateConversationLastMessageAt :exec
UPDATE conversations SET last_message_at = NOW() WHERE id = $1;

-- name: CountUnreadConversationsByCandidate :one
SELECT count(DISTINCT c.id)::int FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
    AND cp.participant_type = 'candidate' AND cp.participant_id = $1
WHERE c.candidate_id = $1
    AND EXISTS (
        SELECT 1 FROM messages m
        WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_type != 'candidate'
    );

-- name: CountUnreadConversationsByCompany :one
SELECT count(DISTINCT c.id)::int FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
    AND cp.participant_type = 'company' AND cp.participant_id = $1
WHERE c.company_id = $1
    AND EXISTS (
        SELECT 1 FROM messages m
        WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_type != 'company'
    );
