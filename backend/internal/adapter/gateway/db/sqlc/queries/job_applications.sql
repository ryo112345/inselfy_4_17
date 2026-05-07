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
       COALESCE(u.headline, '') AS candidate_headline,
       COALESCE(u.profile_color, '') AS candidate_profile_color,
       COALESCE(u.job_seeking_status, '') AS candidate_seeking_status,
       COALESCE((SELECT array_agg(s.name ORDER BY us.created_at)
                 FROM user_skills us JOIN skills s ON s.id = us.skill_id
                 WHERE us.user_id = u.id), '{}') AS candidate_skills
FROM job_applications ja
JOIN job_postings jp ON jp.id = ja.job_posting_id
JOIN company_accounts ca ON ca.id = ja.company_id
JOIN users u ON u.id = ja.candidate_id
WHERE ja.company_id = $1
  AND (sqlc.narg('status')::TEXT IS NULL OR ja.status = sqlc.narg('status'))
  AND (sqlc.narg('job_posting_id')::UUID IS NULL OR ja.job_posting_id = sqlc.narg('job_posting_id'))
  AND (sqlc.narg('keyword')::TEXT IS NULL
       OR u.name ILIKE '%' || sqlc.narg('keyword') || '%'
       OR COALESCE(u.headline, '') ILIKE '%' || sqlc.narg('keyword') || '%'
       OR jp.title ILIKE '%' || sqlc.narg('keyword') || '%'
       OR EXISTS (SELECT 1 FROM user_skills us2 JOIN skills s2 ON s2.id = us2.skill_id
                  WHERE us2.user_id = u.id AND s2.name ILIKE '%' || sqlc.narg('keyword') || '%'))
  AND (sqlc.narg('date_from')::TIMESTAMPTZ IS NULL OR ja.created_at >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::TIMESTAMPTZ IS NULL OR ja.created_at < sqlc.narg('date_to'))
ORDER BY ja.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountJobApplicationsByCompanyID :one
SELECT COUNT(*) FROM job_applications ja
JOIN users u ON u.id = ja.candidate_id
JOIN job_postings jp ON jp.id = ja.job_posting_id
WHERE ja.company_id = $1
  AND (sqlc.narg('status')::TEXT IS NULL OR ja.status = sqlc.narg('status'))
  AND (sqlc.narg('job_posting_id')::UUID IS NULL OR ja.job_posting_id = sqlc.narg('job_posting_id'))
  AND (sqlc.narg('keyword')::TEXT IS NULL
       OR u.name ILIKE '%' || sqlc.narg('keyword') || '%'
       OR COALESCE(u.headline, '') ILIKE '%' || sqlc.narg('keyword') || '%'
       OR jp.title ILIKE '%' || sqlc.narg('keyword') || '%'
       OR EXISTS (SELECT 1 FROM user_skills us2 JOIN skills s2 ON s2.id = us2.skill_id
                  WHERE us2.user_id = u.id AND s2.name ILIKE '%' || sqlc.narg('keyword') || '%'))
  AND (sqlc.narg('date_from')::TIMESTAMPTZ IS NULL OR ja.created_at >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::TIMESTAMPTZ IS NULL OR ja.created_at < sqlc.narg('date_to'));

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
