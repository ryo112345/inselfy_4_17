-- name: CreateIntegratedReportRequest :one
INSERT INTO integrated_report_requests (user_id, topic1, topic2, topic3, free_text)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetIntegratedReportRequestByID :one
SELECT id, user_id, topic1, topic2, topic3, free_text, created_at
FROM integrated_report_requests
WHERE id = $1;

-- name: GetLatestIntegratedReportRequestByUserID :one
SELECT id, user_id, topic1, topic2, topic3, free_text, created_at
FROM integrated_report_requests
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: GetIntegratedReportByRequestID :one
SELECT id, request_id, user_id, content, created_at, viewed_at
FROM integrated_reports
WHERE request_id = $1;

-- name: GetLatestIntegratedReportByUserID :one
SELECT r.id, r.request_id, r.user_id, r.content, r.created_at, r.viewed_at
FROM integrated_reports r
JOIN integrated_report_requests req ON req.id = r.request_id
WHERE r.user_id = $1
ORDER BY r.created_at DESC
LIMIT 1;

-- name: UpsertIntegratedReport :one
INSERT INTO integrated_reports (request_id, user_id, content)
VALUES ($1, $2, $3)
ON CONFLICT (request_id)
DO UPDATE SET content = EXCLUDED.content, created_at = NOW()
RETURNING *;

-- name: MarkIntegratedReportViewed :exec
UPDATE integrated_reports SET viewed_at = NOW()
WHERE request_id = $1 AND viewed_at IS NULL;

-- name: ResetIntegratedReportViewed :exec
UPDATE integrated_reports SET viewed_at = NULL
WHERE request_id = $1;

-- name: ListIntegratedReports :many
SELECT
    r.id,
    r.request_id,
    r.user_id,
    r.created_at,
    r.viewed_at,
    u.username,
    u.display_name
FROM integrated_reports r
JOIN users u ON u.id = r.user_id
ORDER BY r.created_at DESC;

-- name: ListIntegratedRequestsWithoutReport :many
SELECT
    req.id AS request_id,
    req.user_id,
    req.topic1,
    req.topic2,
    req.topic3,
    req.free_text,
    req.created_at,
    u.username,
    u.display_name
FROM integrated_report_requests req
JOIN users u ON u.id = req.user_id
LEFT JOIN integrated_reports r ON r.request_id = req.id
WHERE r.id IS NULL
ORDER BY req.created_at DESC;

-- name: GetLatestWVCompletedSessionByUserID :one
SELECT id FROM work_values_sessions
WHERE user_id = $1 AND status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;

-- name: GetLatestCICompletedSessionByUserID :one
SELECT id FROM career_interest_sessions
WHERE user_id = $1 AND status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
