package initializer

import (
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireMessaging assembles the notification and direct-message controllers
// for both candidates and companies.
func wireMessaging(ss *httpcontroller.StrictServer, d *deps) {
	ss.WireMessagingGroup(
		httpcontroller.NewMessagingController(usecase.NewMessagingInteractor(
			d.convRepo, d.msgRepo, d.participantRepo, d.tx,
		)),
		httpcontroller.NewNotificationController(usecase.NewNotificationInteractor(d.notificationRepo)),
	)
}
