-- name: CreatePost :one
INSERT INTO posts (user_id, content, quote_post_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPostByID :one
SELECT *
FROM posts
WHERE id = $1;

-- name: GetPostWithUserByID :one
SELECT p.*, u.username, u.name AS user_name,
  (SELECT count(*) FROM post_likes pl WHERE pl.post_id = p.id)::int AS like_count,
  (SELECT count(*) FROM post_comments pc WHERE pc.post_id = p.id)::int AS comment_count,
  (SELECT count(*) FROM post_reposts pr WHERE pr.post_id = p.id)::int AS repost_count,
  EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) AS liked_by_me,
  EXISTS(SELECT 1 FROM post_reposts pr WHERE pr.post_id = p.id AND pr.user_id = $2) AS reposted_by_me,
  false AS is_repost,
  COALESCE(qp.content, '') AS quote_content,
  COALESCE(qu.username, '') AS quote_username,
  COALESCE(qu.name, '') AS quote_name,
  qp.created_at AS quote_created_at
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN posts qp ON qp.id = p.quote_post_id
LEFT JOIN users qu ON qu.id = qp.user_id
WHERE p.id = $1;

-- name: ListTimelinePosts :many
SELECT p.*, u.username, u.name AS user_name,
  (SELECT count(*) FROM post_likes pl WHERE pl.post_id = p.id)::int AS like_count,
  (SELECT count(*) FROM post_comments pc WHERE pc.post_id = p.id)::int AS comment_count,
  (SELECT count(*) FROM post_reposts pr WHERE pr.post_id = p.id)::int AS repost_count,
  EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3) AS liked_by_me,
  EXISTS(SELECT 1 FROM post_reposts pr WHERE pr.post_id = p.id AND pr.user_id = $3) AS reposted_by_me,
  false AS is_repost,
  COALESCE(qp.content, '') AS quote_content,
  COALESCE(qu.username, '') AS quote_username,
  COALESCE(qu.name, '') AS quote_name,
  qp.created_at AS quote_created_at
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN posts qp ON qp.id = p.quote_post_id
LEFT JOIN users qu ON qu.id = qp.user_id
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountTimelinePosts :one
SELECT count(*) FROM posts;

-- name: ListPostsByUserID :many
SELECT p.*, u.username, u.name AS user_name,
  (SELECT count(*) FROM post_likes pl WHERE pl.post_id = p.id)::int AS like_count,
  (SELECT count(*) FROM post_comments pc WHERE pc.post_id = p.id)::int AS comment_count,
  (SELECT count(*) FROM post_reposts pr WHERE pr.post_id = p.id)::int AS repost_count,
  EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $4) AS liked_by_me,
  EXISTS(SELECT 1 FROM post_reposts pr WHERE pr.post_id = p.id AND pr.user_id = $4) AS reposted_by_me,
  (pr_self.user_id IS NOT NULL AND p.user_id != $1)::bool AS is_repost,
  COALESCE(qp.content, '') AS quote_content,
  COALESCE(qu.username, '') AS quote_username,
  COALESCE(qu.name, '') AS quote_name,
  qp.created_at AS quote_created_at
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN post_reposts pr_self ON pr_self.post_id = p.id AND pr_self.user_id = $1
LEFT JOIN posts qp ON qp.id = p.quote_post_id
LEFT JOIN users qu ON qu.id = qp.user_id
WHERE p.user_id = $1 OR pr_self.user_id IS NOT NULL
ORDER BY COALESCE(pr_self.created_at, p.created_at) DESC
LIMIT $2 OFFSET $3;

-- name: CountPostsByUserID :one
SELECT count(DISTINCT p.id)
FROM posts p
LEFT JOIN post_reposts pr ON pr.post_id = p.id AND pr.user_id = $1
WHERE p.user_id = $1 OR pr.user_id IS NOT NULL;

-- name: DeletePost :exec
DELETE FROM posts WHERE id = $1;

-- name: LikePost :exec
INSERT INTO post_likes (post_id, user_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: UnlikePost :exec
DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2;

-- name: IsPostLiked :one
SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2);

-- name: CountPostLikes :one
SELECT count(*) FROM post_likes WHERE post_id = $1;

-- name: CreatePostComment :one
INSERT INTO post_comments (post_id, user_id, content)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListPostComments :many
SELECT c.*, u.username, u.name AS user_name
FROM post_comments c
JOIN users u ON u.id = c.user_id
WHERE c.post_id = $1
ORDER BY c.created_at ASC
LIMIT $2 OFFSET $3;

-- name: CountPostComments :one
SELECT count(*) FROM post_comments WHERE post_id = $1;

-- name: DeletePostComment :exec
DELETE FROM post_comments WHERE id = $1;

-- name: GetPostCommentByID :one
SELECT * FROM post_comments WHERE id = $1;

-- name: ListLikedPostsByUserID :many
SELECT p.*, u.username, u.name AS user_name,
  (SELECT count(*) FROM post_likes pl WHERE pl.post_id = p.id)::int AS like_count,
  (SELECT count(*) FROM post_comments pc WHERE pc.post_id = p.id)::int AS comment_count,
  (SELECT count(*) FROM post_reposts pr WHERE pr.post_id = p.id)::int AS repost_count,
  true AS liked_by_me,
  EXISTS(SELECT 1 FROM post_reposts pr WHERE pr.post_id = p.id AND pr.user_id = $1) AS reposted_by_me,
  false AS is_repost,
  COALESCE(qp.content, '') AS quote_content,
  COALESCE(qu.username, '') AS quote_username,
  COALESCE(qu.name, '') AS quote_name,
  qp.created_at AS quote_created_at
FROM posts p
JOIN users u ON u.id = p.user_id
JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = $1
LEFT JOIN posts qp ON qp.id = p.quote_post_id
LEFT JOIN users qu ON qu.id = qp.user_id
ORDER BY pl.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountLikedPostsByUserID :one
SELECT count(*) FROM post_likes WHERE user_id = $1;

-- name: RepostPost :exec
INSERT INTO post_reposts (post_id, user_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: UndoRepost :exec
DELETE FROM post_reposts WHERE post_id = $1 AND user_id = $2;

-- name: IsPostReposted :one
SELECT EXISTS(SELECT 1 FROM post_reposts WHERE post_id = $1 AND user_id = $2);

-- name: CountPostReposts :one
SELECT count(*) FROM post_reposts WHERE post_id = $1;
