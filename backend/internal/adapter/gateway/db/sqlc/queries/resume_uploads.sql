-- name: CreateResumeUpload :one
INSERT INTO resume_uploads (user_id, original_filename, storage_key)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetResumeUploadByID :one
SELECT *
FROM resume_uploads
WHERE id = $1;

-- name: GetResumeUploadByIDForUpdate :one
SELECT *
FROM resume_uploads
WHERE id = $1
FOR UPDATE;

-- name: GetLatestResumeUploadByUserID :one
SELECT *
FROM resume_uploads
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: ListResumeUploads :many
SELECT sqlc.embed(r), u.name AS user_name, u.username
FROM resume_uploads r
JOIN users u ON u.id = r.user_id
ORDER BY r.created_at DESC;

-- name: ListResumeUploadsByStatus :many
SELECT sqlc.embed(r), u.name AS user_name, u.username
FROM resume_uploads r
JOIN users u ON u.id = r.user_id
WHERE r.status = $1
ORDER BY r.created_at DESC;

-- name: GetResumeUploadWithUserByID :one
SELECT sqlc.embed(r), u.name AS user_name, u.username
FROM resume_uploads r
JOIN users u ON u.id = r.user_id
WHERE r.id = $1;

-- name: UpdateResumeUploadDraft :one
UPDATE resume_uploads
SET draft = $2, status = 'reviewing', updated_at = NOW()
WHERE id = $1 AND status IN ('pending', 'reviewing')
RETURNING *;

-- name: ApproveResumeUpload :one
UPDATE resume_uploads
SET status = 'approved', approved_by = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: RejectResumeUpload :one
UPDATE resume_uploads
SET status = 'rejected', updated_at = NOW()
WHERE id = $1 AND status IN ('pending', 'reviewing')
RETURNING *;
