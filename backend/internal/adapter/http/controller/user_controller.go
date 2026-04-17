// Package controller contains HTTP controllers.
package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// UserController handles user HTTP endpoints.
type UserController struct {
	inputFactory  func(repo port.UserRepository, output port.UserOutputPort) port.UserInputPort
	outputFactory func() *presenter.UserPresenter
	repoFactory   func() port.UserRepository
}

// NewUserController creates a UserController.
func NewUserController(
	inputFactory func(repo port.UserRepository, output port.UserOutputPort) port.UserInputPort,
	outputFactory func() *presenter.UserPresenter,
	repoFactory func() port.UserRepository,
) *UserController {
	return &UserController{
		inputFactory:  inputFactory,
		outputFactory: outputFactory,
		repoFactory:   repoFactory,
	}
}

// Create handles POST /api/users.
func (c *UserController) Create(ctx echo.Context) error {
	var body openapi.ModelsCreateUserRequest
	if err := ctx.Bind(&body); err != nil {
		return ctx.JSON(http.StatusBadRequest, openapi.ModelsBadRequestError{
			Code:    openapi.ModelsBadRequestErrorCodeBADREQUEST,
			Message: "invalid body",
		})
	}
	input, p := c.newIO()
	if err := input.Create(ctx.Request().Context(), user.CreateUserInput{
		Name:     body.Name,
		Username: body.Username,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Response())
}

// GetByUsername handles GET /api/users/:username.
func (c *UserController) GetByUsername(ctx echo.Context, username string) error {
	input, p := c.newIO()
	if err := input.GetByUsername(ctx.Request().Context(), username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Response())
}

func (c *UserController) newIO() (port.UserInputPort, *presenter.UserPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), output)
	return input, output
}
