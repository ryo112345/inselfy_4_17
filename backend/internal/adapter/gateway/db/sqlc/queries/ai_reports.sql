-- name: GetWVSessionByID :one
SELECT id, user_id, status, created_at, completed_at
FROM work_values_sessions
WHERE id = $1;

-- name: GetWVNeedsScoresBySessionID :one
SELECT mu, se, consistency_coefficient, consistency_level
FROM work_needs_scores
WHERE session_id = $1;

-- name: GetAIReportBySessionID :one
SELECT id, session_id, user_id, content, created_at
FROM ai_reports
WHERE session_id = $1;

-- name: UpsertAIReport :one
INSERT INTO ai_reports (session_id, user_id, content)
VALUES ($1, $2, $3)
ON CONFLICT (session_id)
DO UPDATE SET content = EXCLUDED.content, created_at = NOW()
RETURNING *;

-- name: ListSessionsWithoutReport :many
SELECT
    s.id AS session_id,
    s.user_id,
    u.username,
    u.display_name,
    s.completed_at
FROM work_values_sessions s
JOIN users u ON u.id = s.user_id
LEFT JOIN ai_reports r ON r.session_id = s.id
WHERE s.status = 'completed' AND r.id IS NULL
ORDER BY s.completed_at DESC;
