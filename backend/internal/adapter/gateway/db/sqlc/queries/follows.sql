-- name: CreateFollow :exec
INSERT INTO follows (follower_id, following_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: DeleteFollow :exec
DELETE FROM follows
WHERE follower_id = $1 AND following_id = $2;

-- name: IsFollowing :one
SELECT EXISTS(
    SELECT 1 FROM follows
    WHERE follower_id = $1 AND following_id = $2
) AS is_following;

-- name: ListFollowers :many
SELECT u.id, u.username, u.name, u.avatar_url, u.headline, f.created_at
FROM follows f
JOIN users u ON u.id = f.follower_id
WHERE f.following_id = $1
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountFollowers :one
SELECT count(*) FROM follows WHERE following_id = $1;

-- name: ListFollowing :many
SELECT u.id, u.username, u.name, u.avatar_url, u.headline, f.created_at
FROM follows f
JOIN users u ON u.id = f.following_id
WHERE f.follower_id = $1
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountFollowing :one
SELECT count(*) FROM follows WHERE follower_id = $1;

-- name: IncrementFollowersCount :exec
UPDATE users SET followers_count = followers_count + 1 WHERE id = $1;

-- name: DecrementFollowersCount :exec
UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = $1;

-- name: IncrementFollowingCount :exec
UPDATE users SET following_count = following_count + 1 WHERE id = $1;

-- name: DecrementFollowingCount :exec
UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1;

-- name: GetFollowCounts :one
SELECT followers_count, following_count FROM users WHERE id = $1;
