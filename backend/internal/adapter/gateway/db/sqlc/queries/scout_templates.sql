-- name: CreateScoutTemplate :one
INSERT INTO scout_templates (company_id, name, subject, body)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetScoutTemplateByID :one
SELECT * FROM scout_templates WHERE id = $1;

-- name: UpdateScoutTemplate :one
UPDATE scout_templates
SET name = $2, subject = $3, body = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteScoutTemplate :exec
DELETE FROM scout_templates WHERE id = $1;

-- name: ListScoutTemplatesByCompanyID :many
SELECT * FROM scout_templates
WHERE company_id = $1
ORDER BY created_at DESC;

-- name: CountScoutTemplatesByCompanyID :one
SELECT count(*) FROM scout_templates WHERE company_id = $1;
