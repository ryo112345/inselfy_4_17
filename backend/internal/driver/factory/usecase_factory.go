package factory

import (
	"github.com/akiyama/inselfy/backend/internal/port"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

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
