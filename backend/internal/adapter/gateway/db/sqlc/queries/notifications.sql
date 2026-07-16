-- name: CreateNotification :one
INSERT INTO notifications (user_id, company_id, type, title, body, reference_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListNotificationsByUserID :many
SELECT * FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountNotificationsByUserID :one
SELECT count(*) FROM notifications WHERE user_id = $1;

-- name: ListNotificationsByCompanyID :many
SELECT * FROM notifications
WHERE company_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountNotificationsByCompanyID :one
SELECT count(*) FROM notifications WHERE company_id = $1;

-- name: MarkNotificationAsReadByUserID :execrows
UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2;

-- name: MarkNotificationAsReadByCompanyID :execrows
UPDATE notifications SET is_read = true WHERE id = $1 AND company_id = $2;

-- name: MarkAllNotificationsAsReadByUserID :exec
UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false;

-- name: MarkAllNotificationsAsReadByCompanyID :exec
UPDATE notifications SET is_read = true WHERE company_id = $1 AND is_read = false;

-- name: CountUnreadNotificationsByUserID :one
SELECT count(*) FROM notifications WHERE user_id = $1 AND is_read = false;

-- name: CountUnreadNotificationsByCompanyID :one
SELECT count(*) FROM notifications WHERE company_id = $1 AND is_read = false;
