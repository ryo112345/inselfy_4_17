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

// NewWVScoreRepoFactory returns a factory function that produces WorkValuesScoreRepository instances.
func NewWVScoreRepoFactory(pool *pgxpool.Pool) func() port.WorkValuesScoreRepository {
	return func() port.WorkValuesScoreRepository {
		return sqlcgw.NewWorkValuesScoreRepository(pool)
	}
}

// NewCISessionRepoFactory returns a factory function that produces CareerInterestSessionRepository instances.
func NewCISessionRepoFactory(pool *pgxpool.Pool) func() port.CareerInterestSessionRepository {
	return func() port.CareerInterestSessionRepository {
		return sqlcgw.NewCareerInterestSessionRepository(pool)
	}
}

// NewCIResultRepoFactory returns a factory function that produces CareerInterestResultRepository instances.
func NewCIResultRepoFactory(pool *pgxpool.Pool) func() port.CareerInterestResultRepository {
	return func() port.CareerInterestResultRepository {
		return sqlcgw.NewCareerInterestResultRepository(pool)
	}
}

// NewCIBasicScoreRepoFactory returns a factory function that produces CareerInterestBasicScoreRepository instances.
func NewCIBasicScoreRepoFactory(pool *pgxpool.Pool) func() port.CareerInterestBasicScoreRepository {
	return func() port.CareerInterestBasicScoreRepository {
		return sqlcgw.NewCareerInterestBasicScoreRepository(pool)
	}
}

// NewCITypeScoreRepoFactory returns a factory function that produces CareerInterestTypeScoreRepository instances.
func NewCITypeScoreRepoFactory(pool *pgxpool.Pool) func() port.CareerInterestTypeScoreRepository {
	return func() port.CareerInterestTypeScoreRepository {
		return sqlcgw.NewCareerInterestTypeScoreRepository(pool)
	}
}

// NewPostRepoFactory returns a factory function that produces PostRepository instances.
func NewPostRepoFactory(pool *pgxpool.Pool) func() port.PostRepository {
	return func() port.PostRepository {
		return sqlcgw.NewPostRepository(pool)
	}
}
