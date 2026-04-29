-- name: CreateJobPosting :one
INSERT INTO job_postings (
    company_id, title, description, employment_type, location, status,
    job_category, hiring_count, appeal_points, challenges, team_description,
    team_members,
    skills_gained, tags, required_qualifications, preferred_qualifications,
    work_location, work_location_change_scope, job_description_change_scope,
    contract_type, probation_period, work_hours, break_time, holidays,
    salary_min, salary_max, salary_detail, insurance, remote_policy,
    benefits, smoking_policy, selection_process, cover_image_url,
    highlight_title_role, highlight_title_appeal, highlight_title_challenge, highlight_title_growth
)
VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11,
    $12,
    $13, $14, $15, $16,
    $17, $18, $19,
    $20, $21, $22, $23, $24,
    $25, $26, $27, $28, $29,
    $30, $31, $32, $33,
    $34, $35, $36, $37
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
    skills_gained = $14,
    tags = $15,
    required_qualifications = $16,
    preferred_qualifications = $17,
    work_location = $18,
    work_location_change_scope = $19,
    job_description_change_scope = $20,
    contract_type = $21,
    probation_period = $22,
    work_hours = $23,
    break_time = $24,
    holidays = $25,
    salary_min = $26,
    salary_max = $27,
    salary_detail = $28,
    insurance = $29,
    remote_policy = $30,
    benefits = $31,
    smoking_policy = $32,
    selection_process = $33,
    cover_image_url = $34,
    highlight_title_role = $35,
    highlight_title_appeal = $36,
    highlight_title_challenge = $37,
    highlight_title_growth = $38,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteJobPosting :exec
DELETE FROM job_postings WHERE id = $1;
