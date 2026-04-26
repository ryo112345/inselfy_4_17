-- name: CreateJobPosting :one
INSERT INTO job_postings (company_id, title, description, employment_type, location)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetJobPostingByID :one
SELECT * FROM job_postings WHERE id = $1;

-- name: ListJobPostingsByCompanyID :many
SELECT * FROM job_postings
WHERE company_id = $1
ORDER BY created_at DESC;

-- name: UpdateJobPosting :one
UPDATE job_postings
SET title = $2,
    description = $3,
    employment_type = $4,
    location = $5,
    is_active = $6,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteJobPosting :exec
DELETE FROM job_postings WHERE id = $1;
