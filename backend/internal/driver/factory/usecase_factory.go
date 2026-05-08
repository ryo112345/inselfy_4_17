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
) func(userRepo port.UserRepository, refreshRepo port.RefreshTokenRepository, output port.AuthOutputPort) port.AuthInputPort {
	return func(userRepo port.UserRepository, refreshRepo port.RefreshTokenRepository, output port.AuthOutputPort) port.AuthInputPort {
		return usecase.NewAuthInteractor(userRepo, refreshRepo, googleVerifier, jwtService, output, googleClientID)
	}
}

// NewUserInputFactory returns a factory function that builds a UserInputPort.
func NewUserInputFactory() func(repo port.UserRepository, output port.UserOutputPort) port.UserInputPort {
	return func(repo port.UserRepository, output port.UserOutputPort) port.UserInputPort {
		return usecase.NewUserInteractor(repo, output)
	}
}

// NewExperienceInputFactory returns a factory function that builds an ExperienceInputPort.
func NewExperienceInputFactory() func(
	repo port.ExperienceRepository,
	userRepo port.UserRepository,
	output port.ExperienceOutputPort,
) port.ExperienceInputPort {
	return func(
		repo port.ExperienceRepository,
		userRepo port.UserRepository,
		output port.ExperienceOutputPort,
	) port.ExperienceInputPort {
		return usecase.NewExperienceInteractor(repo, userRepo, output)
	}
}

// NewEducationInputFactory returns a factory function that builds an EducationInputPort.
func NewEducationInputFactory() func(
	repo port.EducationRepository,
	userRepo port.UserRepository,
	output port.EducationOutputPort,
) port.EducationInputPort {
	return func(
		repo port.EducationRepository,
		userRepo port.UserRepository,
		output port.EducationOutputPort,
	) port.EducationInputPort {
		return usecase.NewEducationInteractor(repo, userRepo, output)
	}
}

// NewWorkValuesInputFactory returns a factory function that builds a WorkValuesInputPort.
func NewWorkValuesInputFactory() func(
	sessionRepo port.WorkValuesSessionRepository,
	resultRepo port.WorkValuesResultRepository,
	scoreRepo port.WorkValuesScoreRepository,
	output port.WorkValuesOutputPort,
) port.WorkValuesInputPort {
	return func(
		sessionRepo port.WorkValuesSessionRepository,
		resultRepo port.WorkValuesResultRepository,
		scoreRepo port.WorkValuesScoreRepository,
		output port.WorkValuesOutputPort,
	) port.WorkValuesInputPort {
		return usecase.NewWorkValuesInteractor(sessionRepo, resultRepo, scoreRepo, output)
	}
}

// NewCareerInterestInputFactory returns a factory function that builds a CareerInterestInputPort.
func NewCareerInterestInputFactory() func(
	sessionRepo port.CareerInterestSessionRepository,
	resultRepo port.CareerInterestResultRepository,
	basicScoreRepo port.CareerInterestBasicScoreRepository,
	typeScoreRepo port.CareerInterestTypeScoreRepository,
	output port.CareerInterestOutputPort,
) port.CareerInterestInputPort {
	return func(
		sessionRepo port.CareerInterestSessionRepository,
		resultRepo port.CareerInterestResultRepository,
		basicScoreRepo port.CareerInterestBasicScoreRepository,
		typeScoreRepo port.CareerInterestTypeScoreRepository,
		output port.CareerInterestOutputPort,
	) port.CareerInterestInputPort {
		return usecase.NewCareerInterestInteractor(sessionRepo, resultRepo, basicScoreRepo, typeScoreRepo, output)
	}
}

// NewPostInputFactory returns a factory function that builds a PostInputPort.
func NewPostInputFactory() func(repo port.PostRepository, output port.PostOutputPort) port.PostInputPort {
	return func(repo port.PostRepository, output port.PostOutputPort) port.PostInputPort {
		return usecase.NewPostInteractor(repo, output)
	}
}

func NewCompanyAuthInputFactory(
	jwtService port.JWTService,
) func(companyRepo port.CompanyAccountRepository, refreshRepo port.CompanyRefreshTokenRepository, output port.CompanyAuthOutputPort) port.CompanyAuthInputPort {
	hasher := bcryptgw.NewService()
	return func(companyRepo port.CompanyAccountRepository, refreshRepo port.CompanyRefreshTokenRepository, output port.CompanyAuthOutputPort) port.CompanyAuthInputPort {
		return usecase.NewCompanyAuthInteractor(companyRepo, refreshRepo, jwtService, hasher, output)
	}
}

func NewArticleInputFactory(stripeService port.StripeService) func(
	repo port.ArticleRepository,
	purchaseRepo port.ArticlePurchaseRepository,
	output port.ArticleOutputPort,
) port.ArticleInputPort {
	return func(
		repo port.ArticleRepository,
		purchaseRepo port.ArticlePurchaseRepository,
		output port.ArticleOutputPort,
	) port.ArticleInputPort {
		return usecase.NewArticleInteractor(repo, purchaseRepo, stripeService, output)
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
	output port.ScoutOutputPort,
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
		output port.ScoutOutputPort,
	) port.ScoutInputPort {
		return usecase.NewScoutInteractor(msgRepo, creditRepo, ledgerRepo, replyRepo, settingsRepo, notifRepo, userRepo, convRepo, convMsgRepo, participantRepo, tx, output)
	}
}

func NewScoutTemplateInputFactory() func(
	repo port.ScoutTemplateRepository,
	output port.ScoutTemplateOutputPort,
) port.ScoutTemplateInputPort {
	return func(
		repo port.ScoutTemplateRepository,
		output port.ScoutTemplateOutputPort,
	) port.ScoutTemplateInputPort {
		return usecase.NewScoutTemplateInteractor(repo, output)
	}
}

func NewNotificationInputFactory() func(
	repo port.NotificationRepository,
	output port.NotificationOutputPort,
) port.NotificationInputPort {
	return func(
		repo port.NotificationRepository,
		output port.NotificationOutputPort,
	) port.NotificationInputPort {
		return usecase.NewNotificationInteractor(repo, output)
	}
}

func NewJobPostingInputFactory() func(
	repo port.JobPostingRepository,
	output port.JobPostingOutputPort,
) port.JobPostingInputPort {
	return func(
		repo port.JobPostingRepository,
		output port.JobPostingOutputPort,
	) port.JobPostingInputPort {
		return usecase.NewJobPostingInteractor(repo, output)
	}
}

// NewSkillInputFactory returns a factory function that builds a SkillInputPort.
func NewSkillInputFactory() func(
	repo port.SkillRepository,
	userRepo port.UserRepository,
	tx port.TxManager,
	output port.SkillOutputPort,
) port.SkillInputPort {
	return func(
		repo port.SkillRepository,
		userRepo port.UserRepository,
		tx port.TxManager,
		output port.SkillOutputPort,
	) port.SkillInputPort {
		return usecase.NewSkillInteractor(repo, userRepo, tx, output)
	}
}

func NewFollowInputFactory() func(repo port.FollowRepository, userRepo port.UserRepository, output port.FollowOutputPort) port.FollowInputPort {
	return func(repo port.FollowRepository, userRepo port.UserRepository, output port.FollowOutputPort) port.FollowInputPort {
		return usecase.NewFollowInteractor(repo, userRepo, output)
	}
}

func NewJobApplicationInputFactory() func(
	repo port.JobApplicationRepository,
	jobRepo port.JobPostingRepository,
	output port.JobApplicationOutputPort,
) port.JobApplicationInputPort {
	return func(
		repo port.JobApplicationRepository,
		jobRepo port.JobPostingRepository,
		output port.JobApplicationOutputPort,
	) port.JobApplicationInputPort {
		return usecase.NewJobApplicationInteractor(repo, jobRepo, output)
	}
}

func NewMessagingInputFactory() func(
	convRepo port.ConversationRepository,
	msgRepo port.MessageRepository,
	participantRepo port.ConversationParticipantRepository,
	tx port.TxManager,
	output port.MessagingOutputPort,
) port.MessagingInputPort {
	return func(
		convRepo port.ConversationRepository,
		msgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
		output port.MessagingOutputPort,
	) port.MessagingInputPort {
		return usecase.NewMessagingInteractor(convRepo, msgRepo, participantRepo, tx, output)
	}
}
