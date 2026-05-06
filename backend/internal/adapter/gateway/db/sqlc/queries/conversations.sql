-- name: CreateConversation :one
INSERT INTO conversations (company_id, candidate_id)
VALUES ($1, $2)
RETURNING *;

-- name: CreateCandidateConversation :one
INSERT INTO conversations (conversation_type, company_id, candidate_id, participant1_id, participant2_id)
VALUES ('candidate_candidate', NULL, NULL, $1, $2)
RETURNING *;

-- name: GetConversationByID :one
SELECT c.*,
    COALESCE(ca.company_name, '') AS company_name,
    COALESCE(u_cand.name, '') AS candidate_name,
    COALESCE(u_p1.name, '') AS participant1_name,
    COALESCE(u_p2.name, '') AS participant2_name
FROM conversations c
LEFT JOIN company_accounts ca ON ca.id = c.company_id
LEFT JOIN users u_cand ON u_cand.id = c.candidate_id
LEFT JOIN users u_p1 ON u_p1.id = c.participant1_id
LEFT JOIN users u_p2 ON u_p2.id = c.participant2_id
WHERE c.id = $1;

-- name: GetConversationByCompanyAndCandidate :one
SELECT * FROM conversations
WHERE company_id = $1 AND candidate_id = $2;

-- name: GetConversationByCandidatePair :one
SELECT * FROM conversations
WHERE conversation_type = 'candidate_candidate'
  AND participant1_id = $1 AND participant2_id = $2;

-- name: ListConversationsByCandidate :many
SELECT c.*,
    COALESCE(ca.company_name, '') AS company_name,
    COALESCE(u_cand.name, '') AS candidate_name,
    COALESCE(u_p1.name, '') AS participant1_name,
    COALESCE(u_p2.name, '') AS participant2_name,
    (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_body,
    (SELECT count(*)
     FROM messages m2
     JOIN conversation_participants cp ON cp.conversation_id = c.id
         AND cp.participant_type = 'candidate' AND cp.participant_id = @user_id::uuid
     WHERE m2.conversation_id = c.id AND m2.created_at > cp.last_read_at AND m2.sender_id != @user_id::uuid
    )::int AS unread_count
FROM conversations c
JOIN conversation_participants cp_me ON cp_me.conversation_id = c.id
    AND cp_me.participant_type = 'candidate' AND cp_me.participant_id = @user_id
LEFT JOIN company_accounts ca ON ca.id = c.company_id
LEFT JOIN users u_cand ON u_cand.id = c.candidate_id
LEFT JOIN users u_p1 ON u_p1.id = c.participant1_id
LEFT JOIN users u_p2 ON u_p2.id = c.participant2_id
ORDER BY c.last_message_at DESC
LIMIT @row_limit OFFSET @row_offset;

-- name: CountConversationsByCandidate :one
SELECT count(*) FROM conversations c
JOIN conversation_participants cp_me ON cp_me.conversation_id = c.id
    AND cp_me.participant_type = 'candidate' AND cp_me.participant_id = $1;

-- name: ListConversationsByCompany :many
SELECT c.*,
    ca.company_name,
    u.name AS candidate_name,
    '' AS participant1_name,
    '' AS participant2_name,
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
WHERE c.company_id = $1 AND c.conversation_type = 'company_candidate'
ORDER BY c.last_message_at DESC
LIMIT $2 OFFSET $3;

-- name: CountConversationsByCompany :one
SELECT count(*) FROM conversations
WHERE company_id = $1 AND conversation_type = 'company_candidate';

-- name: UpdateConversationLastMessageAt :exec
UPDATE conversations SET last_message_at = NOW() WHERE id = $1;

-- name: CountUnreadConversationsByCandidate :one
SELECT count(DISTINCT c.id)::int FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
    AND cp.participant_type = 'candidate' AND cp.participant_id = $1
WHERE EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_id != $1
);

-- name: CountUnreadConversationsByCompany :one
SELECT count(DISTINCT c.id)::int FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
    AND cp.participant_type = 'company' AND cp.participant_id = $1
WHERE c.company_id = $1 AND c.conversation_type = 'company_candidate'
    AND EXISTS (
        SELECT 1 FROM messages m
        WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_type != 'company'
    );
