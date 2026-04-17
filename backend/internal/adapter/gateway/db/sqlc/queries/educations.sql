-- name: CreateEducation :one
INSERT INTO educations (
    user_id,
    school,
    degree,
    start_year,
    end_year
)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetEducationByID :one
SELECT *
FROM educations
WHERE id = $1;

-- name: ListEducationsByUserID :many
SELECT *
FROM educations
WHERE user_id = $1
ORDER BY
    COALESCE(end_year, 9999) DESC,
    COALESCE(start_year, 0) DESC,
    created_at DESC;

-- name: CountEducationsByUserID :one
SELECT COUNT(*)
FROM educations
WHERE user_id = $1;

-- name: UpdateEducation :one
UPDATE educations
SET
    school = $2,
    degree = $3,
    start_year = $4,
    end_year = $5,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteEducation :execrows
DELETE FROM educations
WHERE id = $1;
