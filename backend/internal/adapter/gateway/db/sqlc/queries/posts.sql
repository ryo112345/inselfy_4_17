-- name: CreatePost :one
INSERT INTO posts (user_id, content)
VALUES ($1, $2)
RETURNING *;

-- name: GetPostByID :one
SELECT *
FROM posts
WHERE id = $1;

-- name: ListTimelinePosts :many
SELECT p.*, u.username, u.name AS user_name
FROM posts p
JOIN users u ON u.id = p.user_id
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountTimelinePosts :one
SELECT count(*) FROM posts;

-- name: ListPostsByUserID :many
SELECT p.*, u.username, u.name AS user_name
FROM posts p
JOIN users u ON u.id = p.user_id
WHERE p.user_id = $1
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountPostsByUserID :one
SELECT count(*) FROM posts WHERE user_id = $1;

-- name: DeletePost :exec
DELETE FROM posts WHERE id = $1;
