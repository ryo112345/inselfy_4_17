-- name: CreateArticle :one
INSERT INTO articles (author_type, author_user_id, author_company_id, title, body, is_paid, price_yen, cover_image_url, tags)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetArticleByID :one
SELECT a.*,
  COALESCE(u.name, ca.company_name) AS author_name,
  u.username AS author_username
FROM articles a
LEFT JOIN users u ON a.author_user_id = u.id
LEFT JOIN company_accounts ca ON a.author_company_id = ca.id
WHERE a.id = $1;

-- name: ListPublishedArticles :many
SELECT a.*,
  COALESCE(u.name, ca.company_name) AS author_name,
  u.username AS author_username
FROM articles a
LEFT JOIN users u ON a.author_user_id = u.id
LEFT JOIN company_accounts ca ON a.author_company_id = ca.id
WHERE a.status = 'published'
ORDER BY a.published_at DESC
LIMIT $1 OFFSET $2;

-- name: CountPublishedArticles :one
SELECT count(*) FROM articles WHERE status = 'published';

-- name: ListArticlesByUserAuthor :many
SELECT a.*,
  u.name AS author_name,
  u.username AS author_username
FROM articles a
JOIN users u ON a.author_user_id = u.id
WHERE a.author_type = 'user' AND a.author_user_id = $1
ORDER BY a.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountArticlesByUserAuthor :one
SELECT count(*) FROM articles WHERE author_type = 'user' AND author_user_id = $1;

-- name: ListArticlesByCompanyAuthor :many
SELECT a.*,
  ca.company_name AS author_name,
  NULL::text AS author_username
FROM articles a
JOIN company_accounts ca ON a.author_company_id = ca.id
WHERE a.author_type = 'company' AND a.author_company_id = $1
ORDER BY a.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountArticlesByCompanyAuthor :one
SELECT count(*) FROM articles WHERE author_type = 'company' AND author_company_id = $1;

-- name: UpdateArticle :one
UPDATE articles
SET title = $2, body = $3, is_paid = $4, price_yen = $5, cover_image_url = $6, tags = $7, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateArticleStripePriceID :exec
UPDATE articles SET stripe_price_id = $2 WHERE id = $1;

-- name: PublishArticle :one
UPDATE articles SET status = 'published', published_at = NOW(), updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteArticle :exec
DELETE FROM articles WHERE id = $1;

-- name: CreateArticlePurchase :one
INSERT INTO article_purchases (article_id, buyer_user_id, stripe_session_id, amount_yen)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: HasPurchasedArticle :one
SELECT EXISTS(
  SELECT 1 FROM article_purchases
  WHERE article_id = $1 AND buyer_user_id = $2 AND status = 'completed'
);

-- name: CompletePurchaseBySessionID :exec
UPDATE article_purchases
SET status = 'completed', stripe_payment_intent_id = $2, completed_at = NOW()
WHERE stripe_session_id = $1;
