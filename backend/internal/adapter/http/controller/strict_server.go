package controller

import (
	"context"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// StrictServer implements the generated StrictServerInterface incrementally
// during the strict-server migration (docs/strict-server-migration.md Phase 3).
// The embedded interface satisfies the operations whose feature group has not
// migrated yet; those are still served by the echo router and never dispatched
// here, so the nil embed is unreachable. Once every group has migrated, the
// embed is removed and conformance becomes a compile-time check again.
//
// Controller fields are populated by the wire_*.go of each migrated group
// before the server starts serving.
type StrictServer struct {
	openapi.StrictServerInterface

	User         *UserController
	Experience   *ExperienceController
	Education    *EducationController
	Skill        *SkillController
	Follow       *FollowController
	SimilarUsers *SimilarUsersController
}

// NewStrictServer wires controllers into the generated StrictServerInterface.
// Feature groups add their controllers here as they migrate off echo.
func NewStrictServer() *StrictServer {
	return &StrictServer{}
}

// --- Users ---
// PATCH /api/users/{username} は raw JSON デコードのため strict を経由しない
// （UserController.UpdateProfileHTTP を wire_user.go が直接 mux に登録する）。

func (s *StrictServer) UsersCreateUser(ctx context.Context, req openapi.UsersCreateUserRequestObject) (openapi.UsersCreateUserResponseObject, error) {
	return s.User.Create(ctx, req)
}

func (s *StrictServer) UsersGetUserByUsername(ctx context.Context, req openapi.UsersGetUserByUsernameRequestObject) (openapi.UsersGetUserByUsernameResponseObject, error) {
	return s.User.GetByUsername(ctx, req)
}

func (s *StrictServer) UsersGetUserById(ctx context.Context, req openapi.UsersGetUserByIdRequestObject) (openapi.UsersGetUserByIdResponseObject, error) {
	return s.User.GetByID(ctx, req)
}

func (s *StrictServer) UsersUploadUserImage(ctx context.Context, req openapi.UsersUploadUserImageRequestObject) (openapi.UsersUploadUserImageResponseObject, error) {
	return s.User.UploadImage(ctx, req)
}

// --- SimilarUsers ---

func (s *StrictServer) SimilarUsersGetSimilarUsers(ctx context.Context, req openapi.SimilarUsersGetSimilarUsersRequestObject) (openapi.SimilarUsersGetSimilarUsersResponseObject, error) {
	return s.SimilarUsers.GetSimilarUsers(ctx, req)
}

// --- Experiences ---

func (s *StrictServer) ExperiencesListExperiences(ctx context.Context, req openapi.ExperiencesListExperiencesRequestObject) (openapi.ExperiencesListExperiencesResponseObject, error) {
	return s.Experience.List(ctx, req)
}

func (s *StrictServer) ExperiencesCreateExperience(ctx context.Context, req openapi.ExperiencesCreateExperienceRequestObject) (openapi.ExperiencesCreateExperienceResponseObject, error) {
	return s.Experience.Create(ctx, req)
}

func (s *StrictServer) ExperiencesUpdateExperience(ctx context.Context, req openapi.ExperiencesUpdateExperienceRequestObject) (openapi.ExperiencesUpdateExperienceResponseObject, error) {
	return s.Experience.Update(ctx, req)
}

func (s *StrictServer) ExperiencesDeleteExperience(ctx context.Context, req openapi.ExperiencesDeleteExperienceRequestObject) (openapi.ExperiencesDeleteExperienceResponseObject, error) {
	return s.Experience.Delete(ctx, req)
}

// --- Educations ---

func (s *StrictServer) EducationsListEducations(ctx context.Context, req openapi.EducationsListEducationsRequestObject) (openapi.EducationsListEducationsResponseObject, error) {
	return s.Education.List(ctx, req)
}

func (s *StrictServer) EducationsCreateEducation(ctx context.Context, req openapi.EducationsCreateEducationRequestObject) (openapi.EducationsCreateEducationResponseObject, error) {
	return s.Education.Create(ctx, req)
}

func (s *StrictServer) EducationsUpdateEducation(ctx context.Context, req openapi.EducationsUpdateEducationRequestObject) (openapi.EducationsUpdateEducationResponseObject, error) {
	return s.Education.Update(ctx, req)
}

func (s *StrictServer) EducationsDeleteEducation(ctx context.Context, req openapi.EducationsDeleteEducationRequestObject) (openapi.EducationsDeleteEducationResponseObject, error) {
	return s.Education.Delete(ctx, req)
}

// --- Skills ---

func (s *StrictServer) SkillsListSkills(ctx context.Context, req openapi.SkillsListSkillsRequestObject) (openapi.SkillsListSkillsResponseObject, error) {
	return s.Skill.List(ctx, req)
}

func (s *StrictServer) SkillsAttachSkill(ctx context.Context, req openapi.SkillsAttachSkillRequestObject) (openapi.SkillsAttachSkillResponseObject, error) {
	return s.Skill.Attach(ctx, req)
}

func (s *StrictServer) SkillsDetachSkill(ctx context.Context, req openapi.SkillsDetachSkillRequestObject) (openapi.SkillsDetachSkillResponseObject, error) {
	return s.Skill.Detach(ctx, req)
}

// --- Follows ---

func (s *StrictServer) FollowsFollowUser(ctx context.Context, req openapi.FollowsFollowUserRequestObject) (openapi.FollowsFollowUserResponseObject, error) {
	return s.Follow.Follow(ctx, req)
}

func (s *StrictServer) FollowsUnfollowUser(ctx context.Context, req openapi.FollowsUnfollowUserRequestObject) (openapi.FollowsUnfollowUserResponseObject, error) {
	return s.Follow.Unfollow(ctx, req)
}

func (s *StrictServer) FollowsGetFollowStatus(ctx context.Context, req openapi.FollowsGetFollowStatusRequestObject) (openapi.FollowsGetFollowStatusResponseObject, error) {
	return s.Follow.GetFollowStatus(ctx, req)
}

func (s *StrictServer) FollowsListFollowers(ctx context.Context, req openapi.FollowsListFollowersRequestObject) (openapi.FollowsListFollowersResponseObject, error) {
	return s.Follow.GetFollowers(ctx, req)
}

func (s *StrictServer) FollowsListFollowing(ctx context.Context, req openapi.FollowsListFollowingRequestObject) (openapi.FollowsListFollowingResponseObject, error) {
	return s.Follow.GetFollowing(ctx, req)
}
