package factory

import (
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
