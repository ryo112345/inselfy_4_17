package initializer

import (
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireMessaging registers notification and direct-message routes for both
// candidates and companies — this group is migrated to strict-server handlers
// (docs/strict-server-migration.md Phase 3-1 グループ9).
func wireMessaging(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
	ss.WireMessagingGroup(
		httpcontroller.NewMessagingController(usecase.NewMessagingInteractor(
			d.convRepo, d.msgRepo, d.participantRepo, d.tx,
		)),
		httpcontroller.NewNotificationController(usecase.NewNotificationInteractor(d.notificationRepo)),
	)

	// --- Candidate Messages ---
	// unread-count は conversations と別リテラルセグメント、read-all 相当も無く
	// {conversationId} と衝突する静的兄弟が無いため priority mux 不要。
	sr.handle("POST /api/messages/conversations", wrapper.CandidateMessagingStartCandidateConversation)
	sr.handle("GET /api/messages/conversations", wrapper.CandidateMessagingListCandidateConversations)
	sr.handle("GET /api/messages/conversations/{conversationId}", wrapper.CandidateMessagingGetCandidateConversation)
	sr.handle("GET /api/messages/conversations/{conversationId}/messages", wrapper.CandidateMessagingListCandidateMessages)
	sr.handle("POST /api/messages/conversations/{conversationId}/messages", wrapper.CandidateMessagingSendCandidateMessage)
	sr.handle("POST /api/messages/conversations/{conversationId}/read", wrapper.CandidateMessagingMarkCandidateConversationRead)
	sr.handle("GET /api/messages/unread-count", wrapper.CandidateMessagingCountCandidateUnreadMessages)

	// --- Company Messages ---
	sr.handle("POST /api/company/messages/conversations", wrapper.CompanyMessagingStartCompanyConversation)
	sr.handle("GET /api/company/messages/conversations", wrapper.CompanyMessagingListCompanyConversations)
	sr.handle("GET /api/company/messages/conversations/{conversationId}", wrapper.CompanyMessagingGetCompanyConversation)
	sr.handle("GET /api/company/messages/conversations/{conversationId}/messages", wrapper.CompanyMessagingListCompanyMessages)
	sr.handle("POST /api/company/messages/conversations/{conversationId}/messages", wrapper.CompanyMessagingSendCompanyMessage)
	sr.handle("POST /api/company/messages/conversations/{conversationId}/read", wrapper.CompanyMessagingMarkCompanyConversationRead)
	sr.handle("GET /api/company/messages/unread-count", wrapper.CompanyMessagingCountCompanyUnreadMessages)

	// --- User Notifications ---
	// read-all（1セグメント）と {id}/read（2セグメント）はセグメント数が違い衝突しない。
	sr.handle("GET /api/notifications", wrapper.UserNotificationsListUserNotifications)
	sr.handle("GET /api/notifications/unread-count", wrapper.UserNotificationsCountUserUnreadNotifications)
	sr.handle("POST /api/notifications/{id}/read", wrapper.UserNotificationsMarkUserNotificationRead)
	sr.handle("POST /api/notifications/read-all", wrapper.UserNotificationsMarkAllUserNotificationsRead)

	// --- Company Notifications ---
	sr.handle("GET /api/company/notifications", wrapper.CompanyNotificationsListCompanyNotifications)
	sr.handle("GET /api/company/notifications/unread-count", wrapper.CompanyNotificationsCountCompanyUnreadNotifications)
	sr.handle("POST /api/company/notifications/{id}/read", wrapper.CompanyNotificationsMarkCompanyNotificationRead)
	sr.handle("POST /api/company/notifications/read-all", wrapper.CompanyNotificationsMarkAllCompanyNotificationsRead)
}
