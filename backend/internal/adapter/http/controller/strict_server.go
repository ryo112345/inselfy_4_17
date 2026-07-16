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
// Controllers are installed by the wire_*.go of each migrated group through
// that group's Wire*Group setter before the server starts serving; the
// per-group setters keep "wire に代入し忘れた controller" a compile error
// instead of a nil dereference at request time.
type StrictServer struct {
	openapi.StrictServerInterface

	user         *UserController
	experience   *ExperienceController
	education    *EducationController
	skill        *SkillController
	follow       *FollowController
	similarUsers *SimilarUsersController
}

// NewStrictServer wires controllers into the generated StrictServerInterface.
// Feature groups add their controllers here as they migrate off echo.
func NewStrictServer() *StrictServer {
	return &StrictServer{}
}

// WireUserGroup installs the wire_user controllers
// (docs/strict-server-migration.md Phase 3-1 グループ1).
func (s *StrictServer) WireUserGroup(
	user *UserController,
	experience *ExperienceController,
	education *EducationController,
	skill *SkillController,
	follow *FollowController,
	similarUsers *SimilarUsersController,
) {
	s.user = user
	s.experience = experience
	s.education = education
	s.skill = skill
	s.follow = follow
	s.similarUsers = similarUsers
}

// --- Users ---
// PATCH /api/users/{username} は raw JSON デコードのため strict を経由しない
// （UserController.UpdateProfileHTTP を wire_user.go が直接 mux に登録する）。

func (s *StrictServer) UsersCreateUser(ctx context.Context, req openapi.UsersCreateUserRequestObject) (openapi.UsersCreateUserResponseObject, error) {
	return s.user.Create(ctx, req)
}

func (s *StrictServer) UsersGetUserByUsername(ctx context.Context, req openapi.UsersGetUserByUsernameRequestObject) (openapi.UsersGetUserByUsernameResponseObject, error) {
	return s.user.GetByUsername(ctx, req)
}

func (s *StrictServer) UsersGetUserById(ctx context.Context, req openapi.UsersGetUserByIdRequestObject) (openapi.UsersGetUserByIdResponseObject, error) {
	return s.user.GetByID(ctx, req)
}

func (s *StrictServer) UsersUploadUserImage(ctx context.Context, req openapi.UsersUploadUserImageRequestObject) (openapi.UsersUploadUserImageResponseObject, error) {
	return s.user.UploadImage(ctx, req)
}

// --- SimilarUsers ---

func (s *StrictServer) SimilarUsersGetSimilarUsers(ctx context.Context, req openapi.SimilarUsersGetSimilarUsersRequestObject) (openapi.SimilarUsersGetSimilarUsersResponseObject, error) {
	return s.similarUsers.GetSimilarUsers(ctx, req)
}

// --- Experiences ---

func (s *StrictServer) ExperiencesListExperiences(ctx context.Context, req openapi.ExperiencesListExperiencesRequestObject) (openapi.ExperiencesListExperiencesResponseObject, error) {
	return s.experience.List(ctx, req)
}

func (s *StrictServer) ExperiencesCreateExperience(ctx context.Context, req openapi.ExperiencesCreateExperienceRequestObject) (openapi.ExperiencesCreateExperienceResponseObject, error) {
	return s.experience.Create(ctx, req)
}

func (s *StrictServer) ExperiencesUpdateExperience(ctx context.Context, req openapi.ExperiencesUpdateExperienceRequestObject) (openapi.ExperiencesUpdateExperienceResponseObject, error) {
	return s.experience.Update(ctx, req)
}

func (s *StrictServer) ExperiencesDeleteExperience(ctx context.Context, req openapi.ExperiencesDeleteExperienceRequestObject) (openapi.ExperiencesDeleteExperienceResponseObject, error) {
	return s.experience.Delete(ctx, req)
}

// --- Educations ---

func (s *StrictServer) EducationsListEducations(ctx context.Context, req openapi.EducationsListEducationsRequestObject) (openapi.EducationsListEducationsResponseObject, error) {
	return s.education.List(ctx, req)
}

func (s *StrictServer) EducationsCreateEducation(ctx context.Context, req openapi.EducationsCreateEducationRequestObject) (openapi.EducationsCreateEducationResponseObject, error) {
	return s.education.Create(ctx, req)
}

func (s *StrictServer) EducationsUpdateEducation(ctx context.Context, req openapi.EducationsUpdateEducationRequestObject) (openapi.EducationsUpdateEducationResponseObject, error) {
	return s.education.Update(ctx, req)
}

func (s *StrictServer) EducationsDeleteEducation(ctx context.Context, req openapi.EducationsDeleteEducationRequestObject) (openapi.EducationsDeleteEducationResponseObject, error) {
	return s.education.Delete(ctx, req)
}

// --- Skills ---

func (s *StrictServer) SkillsListSkills(ctx context.Context, req openapi.SkillsListSkillsRequestObject) (openapi.SkillsListSkillsResponseObject, error) {
	return s.skill.List(ctx, req)
}

func (s *StrictServer) SkillsAttachSkill(ctx context.Context, req openapi.SkillsAttachSkillRequestObject) (openapi.SkillsAttachSkillResponseObject, error) {
	return s.skill.Attach(ctx, req)
}

func (s *StrictServer) SkillsDetachSkill(ctx context.Context, req openapi.SkillsDetachSkillRequestObject) (openapi.SkillsDetachSkillResponseObject, error) {
	return s.skill.Detach(ctx, req)
}

// --- Follows ---

func (s *StrictServer) FollowsFollowUser(ctx context.Context, req openapi.FollowsFollowUserRequestObject) (openapi.FollowsFollowUserResponseObject, error) {
	return s.follow.Follow(ctx, req)
}

func (s *StrictServer) FollowsUnfollowUser(ctx context.Context, req openapi.FollowsUnfollowUserRequestObject) (openapi.FollowsUnfollowUserResponseObject, error) {
	return s.follow.Unfollow(ctx, req)
}

func (s *StrictServer) FollowsGetFollowStatus(ctx context.Context, req openapi.FollowsGetFollowStatusRequestObject) (openapi.FollowsGetFollowStatusResponseObject, error) {
	return s.follow.GetFollowStatus(ctx, req)
}

func (s *StrictServer) FollowsListFollowers(ctx context.Context, req openapi.FollowsListFollowersRequestObject) (openapi.FollowsListFollowersResponseObject, error) {
	return s.follow.GetFollowers(ctx, req)
}

func (s *StrictServer) FollowsListFollowing(ctx context.Context, req openapi.FollowsListFollowingRequestObject) (openapi.FollowsListFollowingResponseObject, error) {
	return s.follow.GetFollowing(ctx, req)
}
