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

-- name: CreateScoutCreditLedger :exec
INSERT INTO scout_credit_ledger (company_id, delta, reason, scout_message_id, balance_after)
VALUES ($1, $2, $3, $4, $5);
