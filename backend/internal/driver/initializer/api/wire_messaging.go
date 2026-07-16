package initializer

import (
	"github.com/labstack/echo/v4"

	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireMessaging registers notification and direct-message routes for both
// candidates and companies.
func wireMessaging(e *echo.Echo, d *deps) {
	notifCtrl := httpcontroller.NewNotificationController(usecase.NewNotificationInteractor(d.notificationRepo))
	messagingCtrl := httpcontroller.NewMessagingController(usecase.NewMessagingInteractor(
		d.convRepo, d.msgRepo, d.participantRepo, d.tx,
	))

	// --- Company Notifications ---
	companyNotifGroup := e.Group("/api/company/notifications")
	companyNotifGroup.GET("", notifCtrl.ListByCompany)
	companyNotifGroup.GET("/unread-count", notifCtrl.CountUnreadByCompany)
	companyNotifGroup.POST("/:id/read", func(c echo.Context) error {
		return notifCtrl.MarkAsReadByCompany(c, c.Param("id"))
	})
	companyNotifGroup.POST("/read-all", notifCtrl.MarkAllAsReadByCompany)

	// --- User Notifications ---
	userNotifGroup := e.Group("/api/notifications")
	userNotifGroup.GET("", notifCtrl.ListByUser)
	userNotifGroup.GET("/unread-count", notifCtrl.CountUnreadByUser)
	userNotifGroup.POST("/:id/read", func(c echo.Context) error {
		return notifCtrl.MarkAsReadByUser(c, c.Param("id"))
	})
	userNotifGroup.POST("/read-all", notifCtrl.MarkAllAsReadByUser)

	// --- Candidate Messages ---
	candidateMsgGroup := e.Group("/api/messages")
	candidateMsgGroup.POST("/conversations", messagingCtrl.StartCandidateConversation)
	candidateMsgGroup.GET("/conversations", messagingCtrl.ListConversationsByCandidate)
	candidateMsgGroup.GET("/conversations/:conversationId", func(c echo.Context) error {
		return messagingCtrl.GetConversationAsCandidate(c, c.Param("conversationId"))
	})
	candidateMsgGroup.GET("/conversations/:conversationId/messages", func(c echo.Context) error {
		return messagingCtrl.ListMessagesAsCandidate(c, c.Param("conversationId"))
	})
	candidateMsgGroup.POST("/conversations/:conversationId/messages", func(c echo.Context) error {
		return messagingCtrl.SendMessageAsCandidate(c, c.Param("conversationId"))
	})
	candidateMsgGroup.POST("/conversations/:conversationId/read", func(c echo.Context) error {
		return messagingCtrl.MarkReadAsCandidate(c, c.Param("conversationId"))
	})
	candidateMsgGroup.GET("/unread-count", messagingCtrl.CountUnreadByCandidate)

	// --- Company Messages ---
	companyMsgGroup := e.Group("/api/company/messages")
	companyMsgGroup.POST("/conversations", messagingCtrl.StartConversation)
	companyMsgGroup.GET("/conversations", messagingCtrl.ListConversationsByCompany)
	companyMsgGroup.GET("/conversations/:conversationId", func(c echo.Context) error {
		return messagingCtrl.GetConversationAsCompany(c, c.Param("conversationId"))
	})
	companyMsgGroup.GET("/conversations/:conversationId/messages", func(c echo.Context) error {
		return messagingCtrl.ListMessagesAsCompany(c, c.Param("conversationId"))
	})
	companyMsgGroup.POST("/conversations/:conversationId/messages", func(c echo.Context) error {
		return messagingCtrl.SendMessageAsCompany(c, c.Param("conversationId"))
	})
	companyMsgGroup.POST("/conversations/:conversationId/read", func(c echo.Context) error {
		return messagingCtrl.MarkReadAsCompany(c, c.Param("conversationId"))
	})
	companyMsgGroup.GET("/unread-count", messagingCtrl.CountUnreadByCompany)
}
