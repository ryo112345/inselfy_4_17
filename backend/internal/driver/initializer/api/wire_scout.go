package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireScout assembles the scout controllers for both sides: company
// sending/templates and candidate inbox/settings.
func wireScout(ss *httpcontroller.StrictServer, d *deps) {
	scoutItr := usecase.NewScoutInteractor(
		d.scoutMsgRepo,
		sqlcgw.NewScoutCreditRepository(d.pool),
		sqlcgw.NewScoutCreditLedgerRepository(d.pool),
		sqlcgw.NewScoutReplyRepository(d.pool),
		sqlcgw.NewUserScoutSettingsRepository(d.pool),
		d.notificationRepo,
		d.userRepo,
		d.convRepo, d.msgRepo, d.participantRepo,
		d.tx,
	)
	ss.WireScoutGroup(
		httpcontroller.NewScoutController(scoutItr),
		httpcontroller.NewCandidateScoutController(scoutItr, d.scoutMsgRepo, d.convRepo),
		httpcontroller.NewScoutSettingsController(scoutItr),
		httpcontroller.NewScoutTemplateController(
			usecase.NewScoutTemplateInteractor(sqlcgw.NewScoutTemplateRepository(d.pool)),
		),
	)
}
