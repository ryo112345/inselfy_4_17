package controller

import (
	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// Server implements the generated ServerInterface by delegating to domain controllers.
type Server struct {
	user *UserController
}

var _ openapi.ServerInterface = (*Server)(nil)

// NewServer wires controllers into the generated ServerInterface.
func NewServer(uc *UserController) *Server {
	return &Server{user: uc}
}

// UsersCreateUser handles POST /api/users.
func (s *Server) UsersCreateUser(ctx echo.Context) error {
	return s.user.Create(ctx)
}

// UsersGetUserByUsername handles GET /api/users/{username}.
func (s *Server) UsersGetUserByUsername(ctx echo.Context, username string) error {
	return s.user.GetByUsername(ctx, username)
}
