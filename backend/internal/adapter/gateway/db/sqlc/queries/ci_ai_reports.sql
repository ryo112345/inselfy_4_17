-- name: GetCISessionByID :one
SELECT id, user_id, status, created_at, completed_at
FROM career_interest_sessions
WHERE id = $1;

-- name: GetCIAIReportBySessionID :one
SELECT id, session_id, user_id, content, created_at, viewed_at
FROM ci_ai_reports
WHERE session_id = $1;

-- name: MarkCIAIReportViewed :exec
UPDATE ci_ai_reports SET viewed_at = NOW()
WHERE session_id = $1 AND viewed_at IS NULL;

-- name: ResetCIAIReportViewed :exec
UPDATE ci_ai_reports SET viewed_at = NULL
WHERE session_id = $1;

-- name: ListCIAIReports :many
SELECT
    r.id,
    r.session_id,
    r.user_id,
    r.created_at,
    r.viewed_at,
    u.username,
    u.name
FROM ci_ai_reports r
JOIN users u ON u.id = r.user_id
ORDER BY r.created_at DESC;

-- name: UpsertCIAIReport :one
INSERT INTO ci_ai_reports (session_id, user_id, content)
VALUES ($1, $2, $3)
ON CONFLICT (session_id)
DO UPDATE SET content = EXCLUDED.content, created_at = NOW()
RETURNING *;

-- name: ListCISessionsWithoutReport :many
SELECT
    s.id AS session_id,
    s.user_id,
    u.username,
    u.name,
    s.completed_at
FROM career_interest_sessions s
JOIN users u ON u.id = s.user_id
LEFT JOIN ci_ai_reports r ON r.session_id = s.id
WHERE s.status = 'completed' AND r.id IS NULL
ORDER BY s.completed_at DESC;

-- name: GetCIBasicScoresBySessionID :many
SELECT basic_interest_id, score, rank
FROM career_interest_basic_scores
WHERE session_id = $1
ORDER BY rank;

-- name: GetCITypeScoresBySessionID :many
SELECT type_id, score, rank
FROM career_interest_type_scores
WHERE session_id = $1
ORDER BY rank;

-- name: GetCIResultBySessionID :one
SELECT id, session_id, user_id, responses, question_count, differentiation_sd, differentiation_level, created_at
FROM career_interest_results
WHERE session_id = $1;
