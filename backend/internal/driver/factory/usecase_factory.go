package factory

import (
	bcryptgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/bcrypt"
	"github.com/akiyama/inselfy/backend/internal/port"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// NewAuthInputFactory returns a factory function that builds an AuthInputPort.
func NewAuthInputFactory(
	googleVerifier port.GoogleTokenVerifier,
	jwtService port.JWTService,
	googleClientID string,
) func(userRepo port.UserRepository, refreshRepo port.RefreshTokenRepository) port.AuthInputPort {
	return func(userRepo port.UserRepository, refreshRepo port.RefreshTokenRepository) port.AuthInputPort {
		return usecase.NewAuthInteractor(userRepo, refreshRepo, googleVerifier, jwtService, googleClientID)
	}
}

// NewUserInputFactory returns a factory function that builds a UserInputPort.
func NewUserInputFactory() func(repo port.UserRepository) port.UserInputPort {
	return func(repo port.UserRepository) port.UserInputPort {
		return usecase.NewUserInteractor(repo)
	}
}

// NewExperienceInputFactory returns a factory function that builds an ExperienceInputPort.
func NewExperienceInputFactory() func(
	repo port.ExperienceRepository,
	userRepo port.UserRepository,
) port.ExperienceInputPort {
	return func(
		repo port.ExperienceRepository,
		userRepo port.UserRepository,
	) port.ExperienceInputPort {
		return usecase.NewExperienceInteractor(repo, userRepo)
	}
}

// NewEducationInputFactory returns a factory function that builds an EducationInputPort.
func NewEducationInputFactory() func(
	repo port.EducationRepository,
	userRepo port.UserRepository,
) port.EducationInputPort {
	return func(
		repo port.EducationRepository,
		userRepo port.UserRepository,
	) port.EducationInputPort {
		return usecase.NewEducationInteractor(repo, userRepo)
	}
}

// NewWorkValuesInputFactory returns a factory function that builds a WorkValuesInputPort.
func NewWorkValuesInputFactory() func(
	sessionRepo port.WorkValuesSessionRepository,
	resultRepo port.WorkValuesResultRepository,
	scoreRepo port.WorkValuesScoreRepository,
) port.WorkValuesInputPort {
	return func(
		sessionRepo port.WorkValuesSessionRepository,
		resultRepo port.WorkValuesResultRepository,
		scoreRepo port.WorkValuesScoreRepository,
	) port.WorkValuesInputPort {
		return usecase.NewWorkValuesInteractor(sessionRepo, resultRepo, scoreRepo)
	}
}

// NewCareerInterestInputFactory returns a factory function that builds a CareerInterestInputPort.
func NewCareerInterestInputFactory() func(
	sessionRepo port.CareerInterestSessionRepository,
	resultRepo port.CareerInterestResultRepository,
	basicScoreRepo port.CareerInterestBasicScoreRepository,
	typeScoreRepo port.CareerInterestTypeScoreRepository,
) port.CareerInterestInputPort {
	return func(
		sessionRepo port.CareerInterestSessionRepository,
		resultRepo port.CareerInterestResultRepository,
		basicScoreRepo port.CareerInterestBasicScoreRepository,
		typeScoreRepo port.CareerInterestTypeScoreRepository,
	) port.CareerInterestInputPort {
		return usecase.NewCareerInterestInteractor(sessionRepo, resultRepo, basicScoreRepo, typeScoreRepo)
	}
}

// NewPostInputFactory returns a factory function that builds a PostInputPort.
func NewPostInputFactory() func(repo port.PostRepository) port.PostInputPort {
	return func(repo port.PostRepository) port.PostInputPort {
		return usecase.NewPostInteractor(repo)
	}
}

func NewCompanyAuthInputFactory(
	jwtService port.JWTService,
) func(companyRepo port.CompanyAccountRepository, refreshRepo port.CompanyRefreshTokenRepository) port.CompanyAuthInputPort {
	hasher := bcryptgw.NewService()
	return func(companyRepo port.CompanyAccountRepository, refreshRepo port.CompanyRefreshTokenRepository) port.CompanyAuthInputPort {
		return usecase.NewCompanyAuthInteractor(companyRepo, refreshRepo, jwtService, hasher)
	}
}

func NewArticleInputFactory(stripeService port.StripeService) func(
	repo port.ArticleRepository,
	purchaseRepo port.ArticlePurchaseRepository,
) port.ArticleInputPort {
	return func(
		repo port.ArticleRepository,
		purchaseRepo port.ArticlePurchaseRepository,
	) port.ArticleInputPort {
		return usecase.NewArticleInteractor(repo, purchaseRepo, stripeService)
	}
}

func NewScoutInputFactory() func(
	msgRepo port.ScoutMessageRepository,
	creditRepo port.ScoutCreditRepository,
	ledgerRepo port.ScoutCreditLedgerRepository,
	replyRepo port.ScoutReplyRepository,
	settingsRepo port.UserScoutSettingsRepository,
	notifRepo port.NotificationRepository,
	userRepo port.UserRepository,
	convRepo port.ConversationRepository,
	convMsgRepo port.MessageRepository,
	participantRepo port.ConversationParticipantRepository,
	tx port.TxManager,
) port.ScoutInputPort {
	return func(
		msgRepo port.ScoutMessageRepository,
		creditRepo port.ScoutCreditRepository,
		ledgerRepo port.ScoutCreditLedgerRepository,
		replyRepo port.ScoutReplyRepository,
		settingsRepo port.UserScoutSettingsRepository,
		notifRepo port.NotificationRepository,
		userRepo port.UserRepository,
		convRepo port.ConversationRepository,
		convMsgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
	) port.ScoutInputPort {
		return usecase.NewScoutInteractor(msgRepo, creditRepo, ledgerRepo, replyRepo, settingsRepo, notifRepo, userRepo, convRepo, convMsgRepo, participantRepo, tx)
	}
}

func NewScoutTemplateInputFactory() func(
	repo port.ScoutTemplateRepository,
) port.ScoutTemplateInputPort {
	return func(
		repo port.ScoutTemplateRepository,
	) port.ScoutTemplateInputPort {
		return usecase.NewScoutTemplateInteractor(repo)
	}
}

func NewNotificationInputFactory() func(
	repo port.NotificationRepository,
) port.NotificationInputPort {
	return func(
		repo port.NotificationRepository,
	) port.NotificationInputPort {
		return usecase.NewNotificationInteractor(repo)
	}
}

func NewJobPostingInputFactory() func(
	repo port.JobPostingRepository,
) port.JobPostingInputPort {
	return func(
		repo port.JobPostingRepository,
	) port.JobPostingInputPort {
		return usecase.NewJobPostingInteractor(repo)
	}
}

// NewSkillInputFactory returns a factory function that builds a SkillInputPort.
func NewSkillInputFactory() func(
	repo port.SkillRepository,
	userRepo port.UserRepository,
	tx port.TxManager,
) port.SkillInputPort {
	return func(
		repo port.SkillRepository,
		userRepo port.UserRepository,
		tx port.TxManager,
	) port.SkillInputPort {
		return usecase.NewSkillInteractor(repo, userRepo, tx)
	}
}

func NewFollowInputFactory() func(repo port.FollowRepository, userRepo port.UserRepository) port.FollowInputPort {
	return func(repo port.FollowRepository, userRepo port.UserRepository) port.FollowInputPort {
		return usecase.NewFollowInteractor(repo, userRepo)
	}
}

func NewJobApplicationInputFactory() func(
	repo port.JobApplicationRepository,
	jobRepo port.JobPostingRepository,
) port.JobApplicationInputPort {
	return func(
		repo port.JobApplicationRepository,
		jobRepo port.JobPostingRepository,
	) port.JobApplicationInputPort {
		return usecase.NewJobApplicationInteractor(repo, jobRepo)
	}
}

func NewMessagingInputFactory() func(
	convRepo port.ConversationRepository,
	msgRepo port.MessageRepository,
	participantRepo port.ConversationParticipantRepository,
	tx port.TxManager,
) port.MessagingInputPort {
	return func(
		convRepo port.ConversationRepository,
		msgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
	) port.MessagingInputPort {
		return usecase.NewMessagingInteractor(convRepo, msgRepo, participantRepo, tx)
	}
}
