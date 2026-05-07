-- name: CreateJobApplication :one
INSERT INTO job_applications (job_posting_id, candidate_id, company_id, status, message)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetJobApplicationByID :one
SELECT ja.*,
       jp.title AS job_title,
       ca.company_name,
       u.name AS candidate_name,
       COALESCE(u.avatar_url, '') AS candidate_avatar,
       u.username AS candidate_username,
       COALESCE(u.headline, '') AS candidate_headline
FROM job_applications ja
JOIN job_postings jp ON jp.id = ja.job_posting_id
JOIN company_accounts ca ON ca.id = ja.company_id
JOIN users u ON u.id = ja.candidate_id
WHERE ja.id = $1;

-- name: GetJobApplicationByCandidateAndJob :one
SELECT * FROM job_applications
WHERE candidate_id = $1 AND job_posting_id = $2;

-- name: ListJobApplicationsByCompanyID :many
SELECT ja.*,
       jp.title AS job_title,
       ca.company_name,
       u.name AS candidate_name,
       COALESCE(u.avatar_url, '') AS candidate_avatar,
       u.username AS candidate_username,
       COALESCE(u.headline, '') AS candidate_headline
FROM job_applications ja
JOIN job_postings jp ON jp.id = ja.job_posting_id
JOIN company_accounts ca ON ca.id = ja.company_id
JOIN users u ON u.id = ja.candidate_id
WHERE ja.company_id = $1
  AND (sqlc.narg('status')::TEXT IS NULL OR ja.status = sqlc.narg('status'))
ORDER BY ja.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountJobApplicationsByCompanyID :one
SELECT COUNT(*) FROM job_applications
WHERE company_id = $1
  AND (sqlc.narg('status')::TEXT IS NULL OR status = sqlc.narg('status'));

-- name: ListJobApplicationsByCandidateID :many
SELECT ja.*,
       jp.title AS job_title,
       ca.company_name,
       u.name AS candidate_name,
       COALESCE(u.avatar_url, '') AS candidate_avatar,
       u.username AS candidate_username,
       COALESCE(u.headline, '') AS candidate_headline
FROM job_applications ja
JOIN job_postings jp ON jp.id = ja.job_posting_id
JOIN company_accounts ca ON ca.id = ja.company_id
JOIN users u ON u.id = ja.candidate_id
WHERE ja.candidate_id = $1
ORDER BY ja.created_at DESC;

-- name: UpdateJobApplicationStatus :exec
UPDATE job_applications SET status = $2, updated_at = NOW() WHERE id = $1;
