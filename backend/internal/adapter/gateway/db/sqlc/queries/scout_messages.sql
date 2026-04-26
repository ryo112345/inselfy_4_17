-- name: CreateScoutMessage :one
INSERT INTO scout_messages (
    company_id, candidate_id, job_posting_id, template_id,
    subject, body, status, sent_at, expires_at, resend_count
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetScoutMessageByID :one
SELECT sm.*,
    ca.company_name,
    COALESCE(u.display_name, u.name) AS candidate_name,
    jp.title AS job_title
FROM scout_messages sm
JOIN company_accounts ca ON ca.id = sm.company_id
JOIN users u ON u.id = sm.candidate_id
LEFT JOIN job_postings jp ON jp.id = sm.job_posting_id
WHERE sm.id = $1;

-- name: ListScoutMessagesByCompanyID :many
SELECT sm.*,
    ca.company_name,
    COALESCE(u.display_name, u.name) AS candidate_name,
    jp.title AS job_title
FROM scout_messages sm
JOIN company_accounts ca ON ca.id = sm.company_id
JOIN users u ON u.id = sm.candidate_id
LEFT JOIN job_postings jp ON jp.id = sm.job_posting_id
WHERE sm.company_id = @company_id
    AND (sqlc.narg('status')::scout_message_status IS NULL OR sm.status = sqlc.narg('status'))
ORDER BY sm.created_at DESC
LIMIT @limit_val OFFSET @offset_val;

-- name: CountScoutMessagesByCompanyID :one
SELECT count(*) FROM scout_messages
WHERE company_id = @company_id
    AND (sqlc.narg('status')::scout_message_status IS NULL OR status = sqlc.narg('status'));

-- name: ListScoutMessagesByCandidateID :many
SELECT sm.*,
    ca.company_name,
    COALESCE(u.display_name, u.name) AS candidate_name,
    jp.title AS job_title
FROM scout_messages sm
JOIN company_accounts ca ON ca.id = sm.company_id
JOIN users u ON u.id = sm.candidate_id
LEFT JOIN job_postings jp ON jp.id = sm.job_posting_id
WHERE sm.candidate_id = $1
    AND sm.status != 'draft'
ORDER BY sm.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountScoutMessagesByCandidateID :one
SELECT count(*) FROM scout_messages
WHERE candidate_id = $1 AND status != 'draft';

-- name: UpdateScoutMessageStatus :exec
UPDATE scout_messages
SET status = $2, updated_at = NOW()
WHERE id = $1;

-- name: MarkScoutMessageOpened :exec
UPDATE scout_messages
SET status = 'opened', opened_at = NOW(), updated_at = NOW()
WHERE id = $1 AND status = 'sent';

-- name: MarkScoutMessageReplied :exec
UPDATE scout_messages
SET status = 'replied', replied_at = NOW(), updated_at = NOW()
WHERE id = $1 AND status IN ('sent', 'opened');

-- name: GetActiveScoutByCompanyAndCandidate :one
SELECT * FROM scout_messages
WHERE company_id = $1 AND candidate_id = $2
    AND status NOT IN ('expired', 'declined')
LIMIT 1;

-- name: GetLatestScoutByCompanyAndCandidate :one
SELECT * FROM scout_messages
WHERE company_id = $1 AND candidate_id = $2
ORDER BY created_at DESC
LIMIT 1;

-- name: CountScoutsSentLast14Days :one
SELECT count(*) FROM scout_messages
WHERE company_id = $1
    AND sent_at >= NOW() - INTERVAL '14 days'
    AND status != 'draft';

-- name: CountScoutsRepliedLast14Days :one
SELECT count(*) FROM scout_messages
WHERE company_id = $1
    AND sent_at >= NOW() - INTERVAL '14 days'
    AND status IN ('replied', 'interested');

-- name: CountScoutsSentLastNDays :one
SELECT count(*) FROM scout_messages
WHERE company_id = $1
    AND sent_at >= NOW() - make_interval(days => $2)
    AND status != 'draft';

-- name: CountScoutsRepliedLastNDays :one
SELECT count(*) FROM scout_messages
WHERE company_id = $1
    AND sent_at >= NOW() - make_interval(days => $2)
    AND status IN ('replied', 'interested');

-- name: ExpireOverdueScoutMessages :execrows
UPDATE scout_messages
SET status = 'expired', updated_at = NOW()
WHERE expires_at < NOW()
    AND status IN ('sent', 'opened');
