-- name: CreateInterviewProposal :one
INSERT INTO interview_proposals (application_id, company_id, candidate_id, message, status, message_id, duration_minutes, expires_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetInterviewProposalByID :one
SELECT * FROM interview_proposals WHERE id = $1;

-- name: UpdateInterviewProposalStatus :exec
UPDATE interview_proposals SET status = $2, updated_at = NOW() WHERE id = $1;

-- name: UpdateInterviewProposalMessageID :exec
UPDATE interview_proposals SET message_id = $2, updated_at = NOW() WHERE id = $1;

-- name: ListPendingProposalsByCandidate :many
SELECT * FROM interview_proposals
WHERE candidate_id = $1 AND status = 'pending' AND expires_at > NOW()
ORDER BY created_at DESC;

-- name: CreateInterviewSlot :one
INSERT INTO interview_slots (proposal_id, application_id, proposed_by, start_time, end_time, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListSlotsByProposal :many
SELECT * FROM interview_slots WHERE proposal_id = $1 ORDER BY start_time ASC;

-- name: GetInterviewSlotByID :one
SELECT * FROM interview_slots WHERE id = $1;

-- name: UpdateInterviewSlotStatus :exec
UPDATE interview_slots SET status = $2, updated_at = NOW() WHERE id = $1;

-- name: RejectOtherSlots :exec
UPDATE interview_slots SET status = 'rejected', updated_at = NOW()
WHERE proposal_id = $1 AND id != $2;

-- name: CreateInterview :one
INSERT INTO interviews (application_id, company_id, candidate_id, title, start_time, end_time, location, meeting_url, internal_notes, status, selected_slot_id, proposal_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetInterviewByID :one
SELECT * FROM interviews WHERE id = $1;

-- name: ListInterviewsByCompany :many
SELECT * FROM interviews
WHERE company_id = $1 AND start_time >= $2 AND start_time < $3
ORDER BY start_time ASC;

-- name: ListInterviewsByCandidate :many
SELECT * FROM interviews
WHERE candidate_id = $1
ORDER BY start_time ASC;

-- name: UpdateInterviewStatus :exec
UPDATE interviews SET status = $2, updated_at = NOW() WHERE id = $1;
