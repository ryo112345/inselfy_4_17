-- name: CreateCompanyAccount :one
INSERT INTO company_accounts (email, password_hash, company_name, contact_person_name, phone_number)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetCompanyAccountByEmail :one
SELECT * FROM company_accounts WHERE email = $1;

-- name: GetCompanyAccountByID :one
SELECT * FROM company_accounts WHERE id = $1;

-- name: ListCompanyAccountsByStatus :many
SELECT * FROM company_accounts
WHERE status = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountCompanyAccountsByStatus :one
SELECT count(*) FROM company_accounts WHERE status = $1;

-- name: ListAllCompanyAccounts :many
SELECT * FROM company_accounts
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountAllCompanyAccounts :one
SELECT count(*) FROM company_accounts;

-- name: UpdateCompanyStatus :one
UPDATE company_accounts
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CreateCompanyRefreshToken :exec
INSERT INTO company_refresh_tokens (company_id, token_hash, expires_at)
VALUES ($1, $2, $3);

-- name: GetCompanyRefreshTokenByHash :one
SELECT * FROM company_refresh_tokens
WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW();

-- name: RevokeCompanyRefreshTokenByID :exec
UPDATE company_refresh_tokens SET revoked_at = NOW()
WHERE id = $1 AND revoked_at IS NULL;
