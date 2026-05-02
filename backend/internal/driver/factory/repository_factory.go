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

// NewRefreshTokenRepoFactory returns a factory function that produces RefreshTokenRepository instances.
func NewRefreshTokenRepoFactory(pool *pgxpool.Pool) func() port.RefreshTokenRepository {
	return func() port.RefreshTokenRepository {
		return sqlcgw.NewRefreshTokenRepository(pool)
	}
}

func NewCompanyAccountRepoFactory(pool *pgxpool.Pool) func() port.CompanyAccountRepository {
	return func() port.CompanyAccountRepository {
		return sqlcgw.NewCompanyAccountRepository(pool)
	}
}

func NewCompanyRefreshTokenRepoFactory(pool *pgxpool.Pool) func() port.CompanyRefreshTokenRepository {
	return func() port.CompanyRefreshTokenRepository {
		return sqlcgw.NewCompanyRefreshTokenRepository(pool)
	}
}

func NewArticleRepoFactory(pool *pgxpool.Pool) func() port.ArticleRepository {
	return func() port.ArticleRepository {
		return sqlcgw.NewArticleRepository(pool)
	}
}

func NewArticlePurchaseRepoFactory(pool *pgxpool.Pool) func() port.ArticlePurchaseRepository {
	return func() port.ArticlePurchaseRepository {
		return sqlcgw.NewArticlePurchaseRepository(pool)
	}
}

func NewScoutMessageRepoFactory(pool *pgxpool.Pool) func() port.ScoutMessageRepository {
	return func() port.ScoutMessageRepository {
		return sqlcgw.NewScoutMessageRepository(pool)
	}
}

func NewScoutCreditRepoFactory(pool *pgxpool.Pool) func() port.ScoutCreditRepository {
	return func() port.ScoutCreditRepository {
		return sqlcgw.NewScoutCreditRepository(pool)
	}
}

func NewScoutCreditLedgerRepoFactory(pool *pgxpool.Pool) func() port.ScoutCreditLedgerRepository {
	return func() port.ScoutCreditLedgerRepository {
		return sqlcgw.NewScoutCreditLedgerRepository(pool)
	}
}

func NewScoutReplyRepoFactory(pool *pgxpool.Pool) func() port.ScoutReplyRepository {
	return func() port.ScoutReplyRepository {
		return sqlcgw.NewScoutReplyRepository(pool)
	}
}

func NewScoutTemplateRepoFactory(pool *pgxpool.Pool) func() port.ScoutTemplateRepository {
	return func() port.ScoutTemplateRepository {
		return sqlcgw.NewScoutTemplateRepository(pool)
	}
}

func NewUserScoutSettingsRepoFactory(pool *pgxpool.Pool) func() port.UserScoutSettingsRepository {
	return func() port.UserScoutSettingsRepository {
		return sqlcgw.NewUserScoutSettingsRepository(pool)
	}
}

func NewNotificationRepoFactory(pool *pgxpool.Pool) func() port.NotificationRepository {
	return func() port.NotificationRepository {
		return sqlcgw.NewNotificationRepository(pool)
	}
}

func NewJobPostingRepoFactory(pool *pgxpool.Pool) func() port.JobPostingRepository {
	return func() port.JobPostingRepository {
		return sqlcgw.NewJobPostingRepository(pool)
	}
}

func NewFollowRepoFactory(pool *pgxpool.Pool) func() port.FollowRepository {
	return func() port.FollowRepository {
		return sqlcgw.NewFollowRepository(pool)
	}
}
