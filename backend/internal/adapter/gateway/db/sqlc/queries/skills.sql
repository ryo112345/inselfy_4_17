-- name: UpsertSkill :one
INSERT INTO skills (name)
VALUES ($1)
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING *;

-- name: GetSkillByName :one
SELECT *
FROM skills
WHERE name = $1;

-- name: AttachUserSkill :exec
INSERT INTO user_skills (user_id, skill_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: DetachUserSkill :execrows
DELETE FROM user_skills
WHERE user_id = $1 AND skill_id = $2;

-- name: DetachUserSkillByName :execrows
DELETE FROM user_skills
WHERE user_id = $1
  AND skill_id = (SELECT id FROM skills WHERE name = $2);

-- name: ListUserSkills :many
SELECT s.id, s.name, s.created_at, us.created_at AS attached_at
FROM user_skills us
JOIN skills s ON s.id = us.skill_id
WHERE us.user_id = $1
ORDER BY us.created_at ASC;

-- name: CountUserSkills :one
SELECT COUNT(*)
FROM user_skills
WHERE user_id = $1;

-- name: UserHasSkillName :one
SELECT EXISTS (
    SELECT 1 FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = $1 AND s.name = $2
) AS has_skill;
