package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireUser registers user profile routes and their sub-resources
// (experiences, educations, skills, follow, similar users) on the strict
// mux — this group is migrated to strict-server handlers
// (docs/strict-server-migration.md Phase 3-1 グループ1).
func wireUser(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
	userCtrl := httpcontroller.NewUserController(usecase.NewUserInteractor(d.userRepo), d.fileStorage)
	ss.User = userCtrl
	ss.Experience = httpcontroller.NewExperienceController(usecase.NewExperienceInteractor(
		sqlcgw.NewExperienceRepository(d.pool), d.userRepo,
	))
	ss.Education = httpcontroller.NewEducationController(usecase.NewEducationInteractor(
		sqlcgw.NewEducationRepository(d.pool), d.userRepo,
	))
	ss.Skill = httpcontroller.NewSkillController(usecase.NewSkillInteractor(
		sqlcgw.NewSkillRepository(d.pool), d.userRepo, d.tx,
	))
	ss.Follow = httpcontroller.NewFollowController(usecase.NewFollowInteractor(
		sqlcgw.NewFollowRepository(d.pool), d.userRepo,
	))
	ss.SimilarUsers = httpcontroller.NewSimilarUsersController(
		usecase.NewSimilarUsersInteractor(sqlcgw.NewSimilarUsersQueryService(d.pool)),
	)

	// --- Users ---
	sr.handle("POST /api/users", wrapper.UsersCreateUser)
	sr.handle("GET /api/users/{username}", wrapper.UsersGetUserByUsername)
	// absent と null を区別する raw JSON デコードのため strict を経由しない
	// （3-3 パターン集の例外。契約検証は上流の OpenAPI validator が担う）。
	sr.handle("PATCH /api/users/{username}", userCtrl.UpdateProfileHTTP)
	// /api/users/id/* は {username} 系ワイルドカードと ServeMux 上は曖昧に
	// なるため priority mux へ（echo の static-over-param 優先の再現）。
	sr.handleFirst("GET /api/users/id/{id}", wrapper.UsersGetUserById)
	sr.handle("POST /api/users/{username}/upload-image", wrapper.UsersUploadUserImage)

	// --- Similar Users ---
	sr.handleFirst("GET /api/users/id/{userId}/similar", wrapper.SimilarUsersGetSimilarUsers)

	// --- Experiences ---
	sr.handle("GET /api/users/{username}/experiences", wrapper.ExperiencesListExperiences)
	sr.handle("POST /api/users/{username}/experiences", wrapper.ExperiencesCreateExperience)
	sr.handle("PUT /api/users/{username}/experiences/{experienceId}", wrapper.ExperiencesUpdateExperience)
	sr.handle("DELETE /api/users/{username}/experiences/{experienceId}", wrapper.ExperiencesDeleteExperience)

	// --- Educations ---
	sr.handle("GET /api/users/{username}/educations", wrapper.EducationsListEducations)
	sr.handle("POST /api/users/{username}/educations", wrapper.EducationsCreateEducation)
	sr.handle("PUT /api/users/{username}/educations/{educationId}", wrapper.EducationsUpdateEducation)
	sr.handle("DELETE /api/users/{username}/educations/{educationId}", wrapper.EducationsDeleteEducation)

	// --- Skills ---
	sr.handle("GET /api/users/{username}/skills", wrapper.SkillsListSkills)
	sr.handle("POST /api/users/{username}/skills", wrapper.SkillsAttachSkill)
	sr.handle("DELETE /api/users/{username}/skills/{name}", wrapper.SkillsDetachSkill)

	// --- Follow ---
	sr.handle("POST /api/users/{username}/follow", wrapper.FollowsFollowUser)
	sr.handle("DELETE /api/users/{username}/follow", wrapper.FollowsUnfollowUser)
	sr.handle("GET /api/users/{username}/followers", wrapper.FollowsListFollowers)
	sr.handle("GET /api/users/{username}/following", wrapper.FollowsListFollowing)
	sr.handle("GET /api/users/{username}/follow-status", wrapper.FollowsGetFollowStatus)
}
