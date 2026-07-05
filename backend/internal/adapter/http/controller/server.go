package controller

import (
	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// Server implements the generated ServerInterface by delegating to domain controllers.
type Server struct {
	user          *UserController
	experience    *ExperienceController
	education     *EducationController
	skill         *SkillController
	scoutSettings *ScoutSettingsController
}

var _ openapi.ServerInterface = (*Server)(nil)

// NewServer wires controllers into the generated ServerInterface.
func NewServer(
	user *UserController,
	experience *ExperienceController,
	education *EducationController,
	skill *SkillController,
	scoutSettings *ScoutSettingsController,
) *Server {
	return &Server{
		user:          user,
		experience:    experience,
		education:     education,
		skill:         skill,
		scoutSettings: scoutSettings,
	}
}

// --- Users ---

func (s *Server) UsersCreateUser(ctx echo.Context) error { return s.user.Create(ctx) }

func (s *Server) UsersGetUserByUsername(ctx echo.Context, username string) error {
	return s.user.GetByUsername(ctx, username)
}

func (s *Server) UsersUpdateUserProfile(ctx echo.Context, username string) error {
	return s.user.UpdateProfile(ctx, username)
}

// --- Experiences ---

func (s *Server) ExperiencesListExperiences(ctx echo.Context, username string) error {
	return s.experience.List(ctx, username)
}

func (s *Server) ExperiencesCreateExperience(ctx echo.Context, username string) error {
	return s.experience.Create(ctx, username)
}

func (s *Server) ExperiencesUpdateExperience(ctx echo.Context, username, experienceID string) error {
	return s.experience.Update(ctx, username, experienceID)
}

func (s *Server) ExperiencesDeleteExperience(ctx echo.Context, username, experienceID string) error {
	return s.experience.Delete(ctx, username, experienceID)
}

// --- Educations ---

func (s *Server) EducationsListEducations(ctx echo.Context, username string) error {
	return s.education.List(ctx, username)
}

func (s *Server) EducationsCreateEducation(ctx echo.Context, username string) error {
	return s.education.Create(ctx, username)
}

func (s *Server) EducationsUpdateEducation(ctx echo.Context, username, educationID string) error {
	return s.education.Update(ctx, username, educationID)
}

func (s *Server) EducationsDeleteEducation(ctx echo.Context, username, educationID string) error {
	return s.education.Delete(ctx, username, educationID)
}

// --- Skills ---

func (s *Server) SkillsListSkills(ctx echo.Context, username string) error {
	return s.skill.List(ctx, username)
}

func (s *Server) SkillsAttachSkill(ctx echo.Context, username string) error {
	return s.skill.Attach(ctx, username)
}

func (s *Server) SkillsDetachSkill(ctx echo.Context, username, name string) error {
	return s.skill.Detach(ctx, username, name)
}

// --- ScoutSettings ---

func (s *Server) ScoutSettingsGetScoutSettings(ctx echo.Context) error {
	return s.scoutSettings.Get(ctx)
}

func (s *Server) ScoutSettingsUpdateScoutSettings(ctx echo.Context) error {
	return s.scoutSettings.Update(ctx)
}
