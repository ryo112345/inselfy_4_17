// Package http wires HTTP-layer factories (presenters).
package http

import "github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"

// NewUserOutputFactory returns a factory function that creates UserPresenter instances.
func NewUserOutputFactory() func() *presenter.UserPresenter {
	return func() *presenter.UserPresenter {
		return presenter.NewUserPresenter()
	}
}

// NewExperienceOutputFactory returns a factory function that creates ExperiencePresenter instances.
func NewExperienceOutputFactory() func() *presenter.ExperiencePresenter {
	return func() *presenter.ExperiencePresenter {
		return presenter.NewExperiencePresenter()
	}
}

// NewEducationOutputFactory returns a factory function that creates EducationPresenter instances.
func NewEducationOutputFactory() func() *presenter.EducationPresenter {
	return func() *presenter.EducationPresenter {
		return presenter.NewEducationPresenter()
	}
}

// NewSkillOutputFactory returns a factory function that creates SkillPresenter instances.
func NewSkillOutputFactory() func() *presenter.SkillPresenter {
	return func() *presenter.SkillPresenter {
		return presenter.NewSkillPresenter()
	}
}

// NewWorkValuesOutputFactory returns a factory function that creates WorkValuesPresenter instances.
func NewWorkValuesOutputFactory() func() *presenter.WorkValuesPresenter {
	return func() *presenter.WorkValuesPresenter {
		return presenter.NewWorkValuesPresenter()
	}
}

// NewCareerInterestOutputFactory returns a factory function that creates CareerInterestPresenter instances.
func NewCareerInterestOutputFactory() func() *presenter.CareerInterestPresenter {
	return func() *presenter.CareerInterestPresenter {
		return presenter.NewCareerInterestPresenter()
	}
}

// NewPostOutputFactory returns a factory function that creates PostPresenter instances.
func NewPostOutputFactory() func() *presenter.PostPresenter {
	return func() *presenter.PostPresenter {
		return presenter.NewPostPresenter()
	}
}

// NewAuthOutputFactory returns a factory function that creates AuthPresenter instances.
func NewAuthOutputFactory() func() *presenter.AuthPresenter {
	return func() *presenter.AuthPresenter {
		return presenter.NewAuthPresenter()
	}
}
