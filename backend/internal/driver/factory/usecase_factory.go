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
