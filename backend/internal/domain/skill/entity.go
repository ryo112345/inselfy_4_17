// Package skill holds the skill domain model and user-skill association.
package skill

import "time"

// Skill is a global skill tag.
type Skill struct {
	ID   string
	Name string
}

// UserSkill associates a user with a skill.
type UserSkill struct {
	Skill
	AttachedAt time.Time
}
