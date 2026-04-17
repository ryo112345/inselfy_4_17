-- name: CreateExperience :one
INSERT INTO experiences (
    user_id,
    company_name,
    title,
    start_year,
    start_month,
    end_year,
    end_month,
    is_current,
    description
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetExperienceByID :one
SELECT *
FROM experiences
WHERE id = $1;

-- name: ListExperiencesByUserID :many
SELECT *
FROM experiences
WHERE user_id = $1
ORDER BY is_current DESC, start_year DESC, start_month DESC, created_at DESC;

-- name: CountExperiencesByUserID :one
SELECT COUNT(*)
FROM experiences
WHERE user_id = $1;

-- name: UpdateExperience :one
UPDATE experiences
SET
    company_name = $2,
    title = $3,
    start_year = $4,
    start_month = $5,
    end_year = $6,
    end_month = $7,
    is_current = $8,
    description = $9,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteExperience :execrows
DELETE FROM experiences
WHERE id = $1;
