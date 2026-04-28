-- name: GetScoutCreditByCompanyID :one
SELECT * FROM scout_credits WHERE company_id = $1;

-- name: GetOrCreateScoutCredit :one
INSERT INTO scout_credits (company_id)
VALUES ($1)
ON CONFLICT (company_id) DO UPDATE SET company_id = scout_credits.company_id
RETURNING *;

-- name: DeductScoutCredit :one
UPDATE scout_credits
SET balance = balance - 1, updated_at = NOW()
WHERE company_id = $1 AND balance > 0
RETURNING *;

-- name: RefundScoutCredit :one
UPDATE scout_credits
SET balance = LEAST(balance + 1, max_stock), updated_at = NOW()
WHERE company_id = $1
RETURNING *;

-- name: SetQualityWarning :exec
UPDATE scout_credits
SET warning_started_at = NOW(), updated_at = NOW()
WHERE company_id = $1;

-- name: ClearQualityWarning :exec
UPDATE scout_credits
SET warning_started_at = NULL, updated_at = NOW()
WHERE company_id = $1;

-- name: SetTemporaryRestriction :exec
UPDATE scout_credits
SET restriction_started_at = NOW(), warning_started_at = NULL, updated_at = NOW()
WHERE company_id = $1;

-- name: ClearTemporaryRestriction :exec
UPDATE scout_credits
SET restriction_started_at = NULL, updated_at = NOW()
WHERE company_id = $1;

-- name: SetQualityRestricted :exec
UPDATE scout_credits
SET quality_restricted = true, warning_started_at = NULL, restriction_started_at = NULL, updated_at = NOW()
WHERE company_id = $1;

-- name: ReplenishCredits :many
UPDATE scout_credits
SET balance = LEAST(balance + monthly_allowance, max_stock),
    last_replenished_at = NOW(),
    updated_at = NOW()
WHERE last_replenished_at < date_trunc('month', NOW())
RETURNING *;

-- name: CreateScoutCreditLedger :exec
INSERT INTO scout_credit_ledger (company_id, delta, reason, scout_message_id, balance_after)
VALUES ($1, $2, $3, $4, $5);
