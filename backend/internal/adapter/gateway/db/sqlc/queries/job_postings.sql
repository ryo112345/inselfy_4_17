-- name: CreateJobPosting :one
INSERT INTO job_postings (
    company_id, title, description, employment_type, location, status,
    job_category, hiring_count, appeal_points, challenges, team_description,
    team_members, team_label, team_id,
    skills_gained, tags, required_qualifications, preferred_qualifications,
    work_location, work_location_change_scope, job_description_change_scope,
    contract_type, probation_period, work_hours, break_time, holidays,
    salary_min, salary_max, salary_detail, insurance, remote_policy,
    benefits, smoking_policy, selection_process, cover_image_url,
    highlight_title_role, highlight_title_appeal, highlight_title_challenge, highlight_title_growth,
    gallery_urls
)
VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11,
    $12, $13, $14,
    $15, $16, $17, $18,
    $19, $20, $21,
    $22, $23, $24, $25, $26,
    $27, $28, $29, $30, $31,
    $32, $33, $34, $35,
    $36, $37, $38, $39,
    $40
)
RETURNING *;

-- name: GetJobPostingByID :one
SELECT * FROM job_postings WHERE id = $1;

-- name: GetPublicJobPostingByID :one
SELECT * FROM job_postings WHERE id = $1 AND status = 'open';

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
    status = $7,
    job_category = $8,
    hiring_count = $9,
    appeal_points = $10,
    challenges = $11,
    team_description = $12,
    team_members = $13,
    team_label = $14,
    team_id = $15,
    skills_gained = $16,
    tags = $17,
    required_qualifications = $18,
    preferred_qualifications = $19,
    work_location = $20,
    work_location_change_scope = $21,
    job_description_change_scope = $22,
    contract_type = $23,
    probation_period = $24,
    work_hours = $25,
    break_time = $26,
    holidays = $27,
    salary_min = $28,
    salary_max = $29,
    salary_detail = $30,
    insurance = $31,
    remote_policy = $32,
    benefits = $33,
    smoking_policy = $34,
    selection_process = $35,
    cover_image_url = $36,
    highlight_title_role = $37,
    highlight_title_appeal = $38,
    highlight_title_challenge = $39,
    highlight_title_growth = $40,
    gallery_urls = $41,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListPublicJobPostings :many
SELECT jp.*,
       ca.company_name,
       ca.logo_url AS company_logo_url
FROM job_postings jp
JOIN company_accounts ca ON ca.id = jp.company_id
WHERE jp.status = 'open'
ORDER BY jp.created_at DESC;

-- name: DeleteJobPosting :exec
DELETE FROM job_postings WHERE id = $1;
