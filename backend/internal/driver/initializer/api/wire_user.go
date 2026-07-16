package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireUser assembles the user-profile controllers and their sub-resources
// (experiences, educations, skills, follow, similar users). Routes come from
// the generated HandlerWithOptions; the one exception is registered here.
func wireUser(sr *strictRouter, ss *httpcontroller.StrictServer, d *deps) {
	userCtrl := httpcontroller.NewUserController(usecase.NewUserInteractor(d.userRepo), d.fileStorage)
	ss.WireUserGroup(
		userCtrl,
		httpcontroller.NewExperienceController(usecase.NewExperienceInteractor(
			sqlcgw.NewExperienceRepository(d.pool), d.userRepo,
		)),
		httpcontroller.NewEducationController(usecase.NewEducationInteractor(
			sqlcgw.NewEducationRepository(d.pool), d.userRepo,
		)),
		httpcontroller.NewSkillController(usecase.NewSkillInteractor(
			sqlcgw.NewSkillRepository(d.pool), d.userRepo, d.tx,
		)),
		httpcontroller.NewFollowController(usecase.NewFollowInteractor(
			sqlcgw.NewFollowRepository(d.pool), d.userRepo,
		)),
		httpcontroller.NewSimilarUsersController(
			usecase.NewSimilarUsersInteractor(sqlcgw.NewSimilarUsersQueryService(d.pool)),
		),
	)

	// absent と null を区別する raw JSON デコードのため strict を経由しない
	// （3-3 パターン集の例外。契約検証は上流の OpenAPI validator が担う）。
	// 生成側の登録（StrictServer 上の到達しないスタブ）はこの override が抑止する。
	sr.handleOverride("PATCH /api/users/{username}", userCtrl.UpdateProfileHTTP)
}
