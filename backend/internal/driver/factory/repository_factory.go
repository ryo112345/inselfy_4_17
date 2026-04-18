// Package factory wires concrete implementations into factory functions.
package factory

import (
	"github.com/jackc/pgx/v5/pgxpool"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// NewUserRepoFactory returns a factory function that produces UserRepository instances.
func NewUserRepoFactory(pool *pgxpool.Pool) func() port.UserRepository {
	return func() port.UserRepository {
		return sqlcgw.NewUserRepository(pool)
	}
}

// NewExperienceRepoFactory returns a factory function that produces ExperienceRepository instances.
func NewExperienceRepoFactory(pool *pgxpool.Pool) func() port.ExperienceRepository {
	return func() port.ExperienceRepository {
		return sqlcgw.NewExperienceRepository(pool)
	}
}

// NewEducationRepoFactory returns a factory function that produces EducationRepository instances.
func NewEducationRepoFactory(pool *pgxpool.Pool) func() port.EducationRepository {
	return func() port.EducationRepository {
		return sqlcgw.NewEducationRepository(pool)
	}
}

// NewSkillRepoFactory returns a factory function that produces SkillRepository instances.
func NewSkillRepoFactory(pool *pgxpool.Pool) func() port.SkillRepository {
	return func() port.SkillRepository {
		return sqlcgw.NewSkillRepository(pool)
	}
}

// NewWVSessionRepoFactory returns a factory function that produces WorkValuesSessionRepository instances.
func NewWVSessionRepoFactory(pool *pgxpool.Pool) func() port.WorkValuesSessionRepository {
	return func() port.WorkValuesSessionRepository {
		return sqlcgw.NewWorkValuesSessionRepository(pool)
	}
}

// NewWVResultRepoFactory returns a factory function that produces WorkValuesResultRepository instances.
func NewWVResultRepoFactory(pool *pgxpool.Pool) func() port.WorkValuesResultRepository {
	return func() port.WorkValuesResultRepository {
		return sqlcgw.NewWorkValuesResultRepository(pool)
	}
}
