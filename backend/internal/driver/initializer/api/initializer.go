package initializer

import (
	"context"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	googlegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/google"
	jwtgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/jwt"
	storagegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/storage"
	stripegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/stripe"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	ws "github.com/akiyama/inselfy/backend/internal/adapter/ws"
	"github.com/akiyama/inselfy/backend/internal/driver/config"
	driverdb "github.com/akiyama/inselfy/backend/internal/driver/db"
	"github.com/akiyama/inselfy/backend/internal/driver/factory"
	httpfactory "github.com/akiyama/inselfy/backend/internal/driver/factory/http"
	"github.com/akiyama/inselfy/backend/internal/driver/scheduler"
	"github.com/akiyama/inselfy/backend/internal/port"
)

func BuildServer(ctx context.Context) (*echo.Echo, *config.Config, func(), error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, nil, func() {}, err
	}

	pool, err := driverdb.NewPool(ctx, cfg.DatabaseURL())
	if err != nil {
		return nil, nil, func() {}, err
	}
	cleanup := func() { pool.Close() }
	tx := driverdb.NewTxManager(pool)

	googleVerifier := googlegw.NewTokenVerifier()
	jwtService := jwtgw.NewService(cfg.JWTSecret)

	userRepoFactory := factory.NewUserRepoFactory(pool)
	experienceRepoFactory := factory.NewExperienceRepoFactory(pool)
	educationRepoFactory := factory.NewEducationRepoFactory(pool)
	skillRepoFactory := factory.NewSkillRepoFactory(pool)
	postRepoFactory := factory.NewPostRepoFactory(pool)
	refreshTokenRepoFactory := factory.NewRefreshTokenRepoFactory(pool)
	wvSessionRepoFactory := factory.NewWVSessionRepoFactory(pool)
	wvResultRepoFactory := factory.NewWVResultRepoFactory(pool)
	wvScoreRepoFactory := factory.NewWVScoreRepoFactory(pool)
	ciSessionRepoFactory := factory.NewCISessionRepoFactory(pool)
	ciResultRepoFactory := factory.NewCIResultRepoFactory(pool)
	ciBasicScoreRepoFactory := factory.NewCIBasicScoreRepoFactory(pool)
	ciTypeScoreRepoFactory := factory.NewCITypeScoreRepoFactory(pool)
	companyAccountRepoFactory := factory.NewCompanyAccountRepoFactory(pool)
	companyRefreshTokenRepoFactory := factory.NewCompanyRefreshTokenRepoFactory(pool)

	userInputFactory := factory.NewUserInputFactory()
	authInputFactory := factory.NewAuthInputFactory(googleVerifier, jwtService, cfg.GoogleClientID)
	experienceInputFactory := factory.NewExperienceInputFactory()
	educationInputFactory := factory.NewEducationInputFactory()
	skillInputFactory := factory.NewSkillInputFactory()
	postInputFactory := factory.NewPostInputFactory()
	wvInputFactory := factory.NewWorkValuesInputFactory()
	ciInputFactory := factory.NewCareerInterestInputFactory()
	fileStorage := storagegw.NewLocal("./uploads", "/api/uploads")
	stripeService := stripegw.NewService(cfg.StripeSecretKey, "http://localhost:5173")
	articleRepoFactory := factory.NewArticleRepoFactory(pool)
	articlePurchaseRepoFactory := factory.NewArticlePurchaseRepoFactory(pool)

	companyAuthInputFactory := factory.NewCompanyAuthInputFactory(jwtService)

	scoutMsgRepoFactory := factory.NewScoutMessageRepoFactory(pool)
	scoutCreditRepoFactory := factory.NewScoutCreditRepoFactory(pool)
	scoutCreditLedgerRepoFactory := factory.NewScoutCreditLedgerRepoFactory(pool)
	scoutReplyRepoFactory := factory.NewScoutReplyRepoFactory(pool)
	scoutTemplateRepoFactory := factory.NewScoutTemplateRepoFactory(pool)
	userScoutSettingsRepoFactory := factory.NewUserScoutSettingsRepoFactory(pool)
	notificationRepoFactory := factory.NewNotificationRepoFactory(pool)
	jobPostingRepoFactory := factory.NewJobPostingRepoFactory(pool)

	scoutInputFactory := factory.NewScoutInputFactory()
	scoutTemplateInputFactory := factory.NewScoutTemplateInputFactory()
	notificationInputFactory := factory.NewNotificationInputFactory()
	jobPostingInputFactory := factory.NewJobPostingInputFactory()

	userOutputFactory := httpfactory.NewUserOutputFactory()
	authOutputFactory := httpfactory.NewAuthOutputFactory()
	experienceOutputFactory := httpfactory.NewExperienceOutputFactory()
	educationOutputFactory := httpfactory.NewEducationOutputFactory()
	skillOutputFactory := httpfactory.NewSkillOutputFactory()
	postOutputFactory := httpfactory.NewPostOutputFactory()
	wvOutputFactory := httpfactory.NewWorkValuesOutputFactory()
	ciOutputFactory := httpfactory.NewCareerInterestOutputFactory()
	articleInputFactory := factory.NewArticleInputFactory(stripeService)
	articleOutputFactory := httpfactory.NewArticleOutputFactory()

	companyAuthOutputFactory := httpfactory.NewCompanyAuthOutputFactory()
	scoutOutputFactory := httpfactory.NewScoutOutputFactory()
	scoutTemplateOutputFactory := httpfactory.NewScoutTemplateOutputFactory()
	notificationOutputFactory := httpfactory.NewNotificationOutputFactory()
	jobPostingOutputFactory := httpfactory.NewJobPostingOutputFactory()

	followRepoFactory := factory.NewFollowRepoFactory(pool)
	followInputFactory := factory.NewFollowInputFactory()
	followOutputFactory := httpfactory.NewFollowOutputFactory()

	conversationRepoFactory := factory.NewConversationRepoFactory(pool)
	messageRepoFactory := factory.NewMessageRepoFactory(pool)
	participantRepoFactory := factory.NewConversationParticipantRepoFactory(pool)
	messagingInputFactory := factory.NewMessagingInputFactory()
	messagingOutputFactory := httpfactory.NewMessagingOutputFactory()

	jobApplicationRepoFactory := factory.NewJobApplicationRepoFactory(pool)
	jobApplicationInputFactory := factory.NewJobApplicationInputFactory()
	jobApplicationOutputFactory := httpfactory.NewJobApplicationOutputFactory()

	userCtrl := httpcontroller.NewUserController(userInputFactory, userOutputFactory, userRepoFactory)
	authCtrl := httpcontroller.NewAuthController(authInputFactory, authOutputFactory, userRepoFactory, refreshTokenRepoFactory)
	experienceCtrl := httpcontroller.NewExperienceController(experienceInputFactory, experienceOutputFactory, experienceRepoFactory, userRepoFactory)
	educationCtrl := httpcontroller.NewEducationController(educationInputFactory, educationOutputFactory, educationRepoFactory, userRepoFactory)
	skillCtrl := httpcontroller.NewSkillController(skillInputFactory, skillOutputFactory, skillRepoFactory, userRepoFactory, tx)
	postCtrl := httpcontroller.NewPostController(postInputFactory, postOutputFactory, postRepoFactory)
	wvCtrl := httpcontroller.NewWorkValuesController(wvInputFactory, wvOutputFactory, wvSessionRepoFactory, wvResultRepoFactory, wvScoreRepoFactory)
	ciCtrl := httpcontroller.NewCareerInterestController(ciInputFactory, ciOutputFactory, ciSessionRepoFactory, ciResultRepoFactory, ciBasicScoreRepoFactory, ciTypeScoreRepoFactory)
	articleCtrl := httpcontroller.NewArticleController(
		articleInputFactory,
		articleOutputFactory,
		articleRepoFactory,
		articlePurchaseRepoFactory,
		fileStorage,
	)

	scoutCtrl := httpcontroller.NewScoutController(
		scoutInputFactory, scoutOutputFactory,
		scoutMsgRepoFactory, scoutCreditRepoFactory, scoutCreditLedgerRepoFactory,
		scoutReplyRepoFactory, userScoutSettingsRepoFactory, notificationRepoFactory,
		userRepoFactory, tx,
	)
	candidateScoutCtrl := httpcontroller.NewCandidateScoutController(
		scoutInputFactory, scoutOutputFactory,
		scoutMsgRepoFactory, scoutCreditRepoFactory, scoutCreditLedgerRepoFactory,
		scoutReplyRepoFactory, userScoutSettingsRepoFactory, notificationRepoFactory,
		userRepoFactory, tx,
	)
	scoutSettingsCtrl := httpcontroller.NewScoutSettingsController(
		scoutInputFactory, scoutOutputFactory,
		scoutMsgRepoFactory, scoutCreditRepoFactory, scoutCreditLedgerRepoFactory,
		scoutReplyRepoFactory, userScoutSettingsRepoFactory, notificationRepoFactory,
		userRepoFactory, tx,
	)
	scoutTemplateCtrl := httpcontroller.NewScoutTemplateController(
		scoutTemplateInputFactory, scoutTemplateOutputFactory, scoutTemplateRepoFactory,
	)
	notifCtrl := httpcontroller.NewNotificationController(
		notificationInputFactory, notificationOutputFactory, notificationRepoFactory,
	)
	jobPostingCtrl := httpcontroller.NewJobPostingController(
		jobPostingInputFactory, jobPostingOutputFactory, jobPostingRepoFactory,
	)

	followCtrl := httpcontroller.NewFollowController(
		followInputFactory, followOutputFactory, followRepoFactory, userRepoFactory,
	)

	jobApplicationCtrl := httpcontroller.NewJobApplicationController(
		jobApplicationInputFactory, jobApplicationOutputFactory,
		jobApplicationRepoFactory, jobPostingRepoFactory, pool,
	)

	messagingCtrl := httpcontroller.NewMessagingController(
		messagingInputFactory, messagingOutputFactory,
		conversationRepoFactory, messageRepoFactory, participantRepoFactory, tx,
	)

	companyAuthCtrl := httpcontroller.NewCompanyAuthController(
		func(companyRepo port.CompanyAccountRepository, refreshRepo port.CompanyRefreshTokenRepository, output port.CompanyAuthOutputPort) port.CompanyAuthInputPort {
			return companyAuthInputFactory(companyRepo, refreshRepo, output)
		},
		func() *presenter.CompanyAuthPresenter { return companyAuthOutputFactory() },
		companyAccountRepoFactory,
		companyRefreshTokenRepoFactory,
	)

	e := echo.New()
	e.Use(echomw.Recover())
	e.Use(echomw.Logger())
	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{echo.GET, echo.POST, echo.PUT, echo.DELETE, echo.PATCH, echo.OPTIONS},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))

	jwtMW := authmw.JWTAuth(jwtService)
	optionalJwtMW := authmw.OptionalJWTAuth(jwtService)
	companyJwtMW := authmw.CompanyJWTAuth(jwtService)

	// --- Company Auth ---
	companyAuthGroup := e.Group("/api/company/auth")
	companyAuthGroup.POST("/register", companyAuthCtrl.Register)
	companyAuthGroup.POST("/login", companyAuthCtrl.Login)
	companyAuthGroup.POST("/refresh", companyAuthCtrl.Refresh)
	companyAuthGroup.POST("/logout", companyAuthCtrl.Logout)
	companyAuthGroup.GET("/me", companyAuthCtrl.GetMe, companyJwtMW)

	// --- Auth (public) ---
	authGroup := e.Group("/api/auth")
	authGroup.POST("/google", authCtrl.GoogleLogin)
	authGroup.POST("/refresh", authCtrl.Refresh)
	authGroup.POST("/logout", authCtrl.Logout)
	authGroup.GET("/me", authCtrl.GetMe, jwtMW)

	// --- Users ---
	e.POST("/api/users", userCtrl.Create)
	e.GET("/api/users/:username", func(c echo.Context) error {
		return userCtrl.GetByUsername(c, c.Param("username"))
	})
	e.PATCH("/api/users/:username", func(c echo.Context) error {
		return userCtrl.UpdateProfile(c, c.Param("username"))
	}, jwtMW)
	e.GET("/api/users/id/:id", func(c echo.Context) error {
		return userCtrl.GetByID(c, c.Param("id"))
	})

	// --- Similar Users ---
	similarUsersCtrl := httpcontroller.NewSimilarUsersController(pool)
	e.GET("/api/users/id/:id/similar", func(c echo.Context) error {
		return similarUsersCtrl.GetSimilarUsers(c, c.Param("id"))
	})

	// --- Experiences ---
	e.GET("/api/users/:username/experiences", func(c echo.Context) error {
		return experienceCtrl.List(c, c.Param("username"))
	})
	e.POST("/api/users/:username/experiences", func(c echo.Context) error {
		return experienceCtrl.Create(c, c.Param("username"))
	}, jwtMW)
	e.PUT("/api/users/:username/experiences/:experienceId", func(c echo.Context) error {
		return experienceCtrl.Update(c, c.Param("username"), c.Param("experienceId"))
	}, jwtMW)
	e.DELETE("/api/users/:username/experiences/:experienceId", func(c echo.Context) error {
		return experienceCtrl.Delete(c, c.Param("username"), c.Param("experienceId"))
	}, jwtMW)

	// --- Educations ---
	e.GET("/api/users/:username/educations", func(c echo.Context) error {
		return educationCtrl.List(c, c.Param("username"))
	})
	e.POST("/api/users/:username/educations", func(c echo.Context) error {
		return educationCtrl.Create(c, c.Param("username"))
	}, jwtMW)
	e.PUT("/api/users/:username/educations/:educationId", func(c echo.Context) error {
		return educationCtrl.Update(c, c.Param("username"), c.Param("educationId"))
	}, jwtMW)
	e.DELETE("/api/users/:username/educations/:educationId", func(c echo.Context) error {
		return educationCtrl.Delete(c, c.Param("username"), c.Param("educationId"))
	}, jwtMW)

	// --- Skills ---
	e.GET("/api/users/:username/skills", func(c echo.Context) error {
		return skillCtrl.List(c, c.Param("username"))
	})
	e.POST("/api/users/:username/skills", func(c echo.Context) error {
		return skillCtrl.Attach(c, c.Param("username"))
	}, jwtMW)
	e.DELETE("/api/users/:username/skills/:name", func(c echo.Context) error {
		return skillCtrl.Detach(c, c.Param("username"), c.Param("name"))
	}, jwtMW)

	// --- Follow ---
	e.POST("/api/users/:username/follow", func(c echo.Context) error {
		return followCtrl.Follow(c, c.Param("username"))
	}, jwtMW)
	e.DELETE("/api/users/:username/follow", func(c echo.Context) error {
		return followCtrl.Unfollow(c, c.Param("username"))
	}, jwtMW)
	e.GET("/api/users/:username/followers", func(c echo.Context) error {
		return followCtrl.GetFollowers(c, c.Param("username"))
	})
	e.GET("/api/users/:username/following", func(c echo.Context) error {
		return followCtrl.GetFollowing(c, c.Param("username"))
	})
	e.GET("/api/users/:username/follow-status", func(c echo.Context) error {
		return followCtrl.GetFollowStatus(c, c.Param("username"))
	}, jwtMW)

	// --- Static uploads ---
	e.Static("/api/uploads", "./uploads")

	// --- Articles (public) ---
	articleGroup := e.Group("/api/articles")
	articleGroup.GET("", articleCtrl.List)
	articleGroup.GET("/:articleId", func(c echo.Context) error {
		return articleCtrl.GetByID(c, c.Param("articleId"))
	}, optionalJwtMW)

	// --- Articles (user-authored) ---
	articleGroup.GET("/mine", articleCtrl.ListMine, jwtMW)
	articleGroup.POST("/upload-image", articleCtrl.UploadImage, jwtMW)
	articleGroup.POST("", articleCtrl.CreateAsUser, jwtMW)
	articleGroup.PUT("/:articleId", func(c echo.Context) error {
		return articleCtrl.UpdateAsUser(c, c.Param("articleId"))
	}, jwtMW)
	articleGroup.DELETE("/:articleId", func(c echo.Context) error {
		return articleCtrl.DeleteAsUser(c, c.Param("articleId"))
	}, jwtMW)
	articleGroup.POST("/:articleId/publish", func(c echo.Context) error {
		return articleCtrl.PublishAsUser(c, c.Param("articleId"))
	}, jwtMW)
	articleGroup.POST("/:articleId/checkout", func(c echo.Context) error {
		return articleCtrl.CreateCheckout(c, c.Param("articleId"))
	}, jwtMW)

	// --- Articles (company-authored) ---
	companyArticleGroup := e.Group("/api/company/articles", companyJwtMW)
	companyArticleGroup.POST("", articleCtrl.CreateAsCompany)
	companyArticleGroup.PUT("/:articleId", func(c echo.Context) error {
		return articleCtrl.UpdateAsCompany(c, c.Param("articleId"))
	})
	companyArticleGroup.DELETE("/:articleId", func(c echo.Context) error {
		return articleCtrl.DeleteAsCompany(c, c.Param("articleId"))
	})
	companyArticleGroup.POST("/:articleId/publish", func(c echo.Context) error {
		return articleCtrl.PublishAsCompany(c, c.Param("articleId"))
	})

	// --- Stripe Webhook ---
	stripeWebhookCtrl := httpcontroller.NewStripeWebhookController(
		articlePurchaseRepoFactory(),
		cfg.StripeWebhookSecret,
	)
	e.POST("/api/stripe/webhook", stripeWebhookCtrl.HandleWebhook)

	// --- Posts ---
	postGroup := e.Group("/api/posts")
	postGroup.POST("", postCtrl.Create, jwtMW)
	postGroup.GET("", postCtrl.ListTimeline)
	postGroup.GET("/users/:userId", func(c echo.Context) error {
		return postCtrl.ListByUserID(c, c.Param("userId"))
	})
	postGroup.DELETE("/:postId", func(c echo.Context) error {
		return postCtrl.Delete(c, c.Param("postId"))
	}, jwtMW)

	// --- Work Values ---
	wvGroup := e.Group("/api/work-values")
	wvGroup.POST("/sessions", wvCtrl.StartSession)
	wvGroup.POST("/sessions/:sessionId/results", func(c echo.Context) error {
		return wvCtrl.SubmitResult(c, c.Param("sessionId"))
	})
	wvGroup.GET("/users/:userId/results/latest", func(c echo.Context) error {
		return wvCtrl.GetLatestResult(c, c.Param("userId"))
	})
	wvGroup.GET("/sessions/:sessionId/results", func(c echo.Context) error {
		return wvCtrl.GetResultBySessionID(c, c.Param("sessionId"))
	})

	// --- Career Interest ---
	ciGroup := e.Group("/api/career-interest")
	ciGroup.POST("/sessions", ciCtrl.StartSession)
	ciGroup.POST("/sessions/:sessionId/results", func(c echo.Context) error {
		return ciCtrl.SubmitResult(c, c.Param("sessionId"))
	})
	ciGroup.GET("/users/:userId/results/latest", func(c echo.Context) error {
		return ciCtrl.GetLatestResult(c, c.Param("userId"))
	})
	ciGroup.GET("/sessions/:sessionId/results", func(c echo.Context) error {
		return ciCtrl.GetResultBySessionID(c, c.Param("sessionId"))
	})

	// --- Company Profile (public) ---
	companyProfileCtrl := httpcontroller.NewCompanyProfileController(pool)
	e.GET("/api/companies/:id", func(c echo.Context) error {
		return companyProfileCtrl.GetPublicProfile(c)
	})

	// --- Company Teams (public) ---
	publicTeamCtrl := httpcontroller.NewCompanyTeamController(pool)
	e.GET("/api/companies/:id/teams/scores", func(c echo.Context) error {
		return publicTeamCtrl.GetPublicTeamScores(c, c.Param("id"))
	})

	// --- Company Profile (authenticated) ---
	companyProfileGroup := e.Group("/api/company/profile", companyJwtMW)
	companyProfileGroup.GET("", companyProfileCtrl.GetProfile)
	companyProfileGroup.PUT("", companyProfileCtrl.UpdateProfile)
	companyProfileGroup.POST("/image", companyProfileCtrl.UploadImage)
	companyProfileGroup.DELETE("/image", companyProfileCtrl.DeleteImage)

	// --- Company Teams ---
	teamCtrl := httpcontroller.NewCompanyTeamController(pool)
	teamGroup := e.Group("/api/company/teams", companyJwtMW)
	teamGroup.GET("", teamCtrl.ListTeams)
	teamGroup.POST("", teamCtrl.CreateTeam)
	teamGroup.GET("/:teamId", func(c echo.Context) error {
		return teamCtrl.GetTeam(c, c.Param("teamId"))
	})
	teamGroup.PUT("/:teamId", func(c echo.Context) error {
		return teamCtrl.UpdateTeam(c, c.Param("teamId"))
	})
	teamGroup.DELETE("/:teamId", func(c echo.Context) error {
		return teamCtrl.DeleteTeam(c, c.Param("teamId"))
	})
	teamGroup.POST("/:teamId/members", func(c echo.Context) error {
		return teamCtrl.AddMember(c, c.Param("teamId"))
	})
	teamGroup.DELETE("/:teamId/members/:memberId", func(c echo.Context) error {
		return teamCtrl.RemoveMember(c, c.Param("teamId"), c.Param("memberId"))
	})
	teamGroup.GET("/:teamId/scores", func(c echo.Context) error {
		return teamCtrl.GetTeamScores(c, c.Param("teamId"))
	})
	teamGroup.PUT("/:teamId/ace/:memberId", func(c echo.Context) error {
		return teamCtrl.SetAceMember(c, c.Param("teamId"), c.Param("memberId"))
	})
	teamGroup.DELETE("/:teamId/ace", func(c echo.Context) error {
		return teamCtrl.UnsetAceMember(c, c.Param("teamId"))
	})

	// --- Talent Search ---
	talentCtrl := httpcontroller.NewTalentSearchController(pool)
	talentGroup := e.Group("/api/company/talents", companyJwtMW)
	talentGroup.GET("/search", talentCtrl.Search)
	talentGroup.GET("/search/diagnostic", talentCtrl.DiagnosticSearch)
	talentGroup.GET("/search/diagnostic/ci", talentCtrl.CIDiagnosticSearch)
	talentGroup.GET("/search/diagnostic/integrated", talentCtrl.IntegratedDiagnosticSearch)

	// --- Team Diagnose (public) ---
	diagCtrl := httpcontroller.NewTeamDiagnoseController(pool)
	e.GET("/api/team-diagnose/:token", func(c echo.Context) error {
		return diagCtrl.GetByToken(c, c.Param("token"))
	})
	e.PUT("/api/team-diagnose/:token/status", func(c echo.Context) error {
		return diagCtrl.UpdateStatus(c, c.Param("token"))
	})

	// --- Admin ---
	adminUserCtrl := httpcontroller.NewAdminUserController(pool, jwtService)
	adminReportCtrl := httpcontroller.NewAdminReportController(pool)
	adminCompanyCtrl := httpcontroller.NewAdminCompanyController(pool, jwtService)
	adminGroup := e.Group("/api/admin")
	adminGroup.GET("/users", adminUserCtrl.List)
	adminGroup.GET("/companies", adminCompanyCtrl.List)
	adminGroup.PATCH("/companies/:id/status", func(c echo.Context) error {
		return adminCompanyCtrl.UpdateStatus(c, c.Param("id"))
	})
	adminGroup.POST("/companies/:id/bypass-login", func(c echo.Context) error {
		return adminCompanyCtrl.BypassLogin(c, c.Param("id"))
	})
	adminGroup.DELETE("/users/:id", func(c echo.Context) error {
		return adminUserCtrl.Delete(c, c.Param("id"))
	})
	adminGroup.POST("/users/:id/bypass-login", func(c echo.Context) error {
		return adminUserCtrl.BypassLogin(c, c.Param("id"))
	})
	adminGroup.GET("/reports/pending", adminReportCtrl.ListPending)
	adminGroup.GET("/reports/list", adminReportCtrl.ListReports)
	adminGroup.POST("/sessions/:sessionId/reset-viewed", func(c echo.Context) error {
		return adminReportCtrl.ResetViewed(c, c.Param("sessionId"))
	})
	adminGroup.PUT("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.SaveReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.GetReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/sessions/:sessionId/scores", func(c echo.Context) error {
		return adminReportCtrl.GetSessionScores(c, c.Param("sessionId"))
	})
	adminGroup.GET("/sessions/:sessionId/prompt", func(c echo.Context) error {
		return adminReportCtrl.GetPrompt(c, c.Param("sessionId"))
	})

	// --- Admin CI Reports ---
	adminCIReportCtrl := httpcontroller.NewAdminCIReportController(pool)
	adminGroup.GET("/ci-reports/pending", adminCIReportCtrl.ListPending)
	adminGroup.GET("/ci-reports/list", adminCIReportCtrl.ListReports)
	adminGroup.POST("/ci-sessions/:sessionId/reset-viewed", func(c echo.Context) error {
		return adminCIReportCtrl.ResetViewed(c, c.Param("sessionId"))
	})
	adminGroup.PUT("/ci-sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminCIReportCtrl.SaveReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/ci-sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminCIReportCtrl.GetReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/ci-sessions/:sessionId/prompt", func(c echo.Context) error {
		return adminCIReportCtrl.GetPrompt(c, c.Param("sessionId"))
	})

	// --- AI Report (user-facing) ---
	wvGroup.GET("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.GetReport(c, c.Param("sessionId"))
	})
	ciGroup.GET("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminCIReportCtrl.GetReport(c, c.Param("sessionId"))
	})

	// --- Admin Integrated Reports ---
	adminIntReportCtrl := httpcontroller.NewAdminIntegratedReportController(pool)
	adminGroup.GET("/integrated-reports/pending", adminIntReportCtrl.ListPending)
	adminGroup.GET("/integrated-reports/list", adminIntReportCtrl.ListReports)
	adminGroup.POST("/integrated-requests/:requestId/reset-viewed", func(c echo.Context) error {
		return adminIntReportCtrl.ResetViewed(c, c.Param("requestId"))
	})
	adminGroup.PUT("/integrated-requests/:requestId/ai-report", func(c echo.Context) error {
		return adminIntReportCtrl.SaveReport(c, c.Param("requestId"))
	})
	adminGroup.GET("/integrated-requests/:requestId/ai-report", func(c echo.Context) error {
		return adminIntReportCtrl.GetReport(c, c.Param("requestId"))
	})
	adminGroup.GET("/integrated-requests/:requestId/prompt", func(c echo.Context) error {
		return adminIntReportCtrl.GetPrompt(c, c.Param("requestId"))
	})

	// --- Integrated Report (user-facing) ---
	intGroup := e.Group("/api/integrated-report")
	intGroup.POST("/requests", adminIntReportCtrl.CreateRequest, jwtMW)
	intGroup.GET("/me", adminIntReportCtrl.GetReportByUser, jwtMW)
	intGroup.GET("/status", adminIntReportCtrl.GetRequestStatus, jwtMW)
	intGroup.GET("/requests/:requestId/report", func(c echo.Context) error {
		return adminIntReportCtrl.GetReport(c, c.Param("requestId"))
	})
	intGroup.GET("/users/:userId/latest-request", func(c echo.Context) error {
		return adminIntReportCtrl.GetLatestRequest(c, c.Param("userId"))
	})

	// --- Company Scouts ---
	scoutGroup := e.Group("/api/company/scouts", companyJwtMW)
	scoutGroup.POST("", scoutCtrl.Send)
	scoutGroup.GET("", scoutCtrl.List)
	scoutGroup.GET("/credits", scoutCtrl.GetCredits)
	scoutGroup.GET("/quality", scoutCtrl.GetQualityScore)
	scoutGroup.GET("/dashboard", scoutCtrl.GetDashboard)
	scoutGroup.GET("/:scoutId", func(c echo.Context) error {
		return scoutCtrl.GetDetail(c, c.Param("scoutId"))
	})
	scoutGroup.POST("/:scoutId/reply", func(c echo.Context) error {
		return scoutCtrl.Reply(c, c.Param("scoutId"))
	})

	// --- Company Scout Templates ---
	templateGroup := e.Group("/api/company/scout-templates", companyJwtMW)
	templateGroup.POST("", scoutTemplateCtrl.Create)
	templateGroup.GET("", scoutTemplateCtrl.List)
	templateGroup.GET("/:templateId", func(c echo.Context) error {
		return scoutTemplateCtrl.Get(c, c.Param("templateId"))
	})
	templateGroup.PUT("/:templateId", func(c echo.Context) error {
		return scoutTemplateCtrl.Update(c, c.Param("templateId"))
	})
	templateGroup.DELETE("/:templateId", func(c echo.Context) error {
		return scoutTemplateCtrl.Delete(c, c.Param("templateId"))
	})

	// --- Company Jobs ---
	jobGroup := e.Group("/api/company/jobs", companyJwtMW)
	jobGroup.POST("/team-member-photo", httpcontroller.HandleTeamMemberPhotoUpload)
	jobGroup.POST("/gallery-image", httpcontroller.HandleGalleryImageUpload)
	jobGroup.POST("/cover-image", httpcontroller.HandleCoverImageUpload)
	jobGroup.POST("", jobPostingCtrl.Create)
	jobGroup.GET("", jobPostingCtrl.List)
	jobGroup.GET("/:jobId", func(c echo.Context) error {
		return jobPostingCtrl.Get(c, c.Param("jobId"))
	})
	jobGroup.PUT("/:jobId", func(c echo.Context) error {
		return jobPostingCtrl.Update(c, c.Param("jobId"))
	})
	jobGroup.DELETE("/:jobId", func(c echo.Context) error {
		return jobPostingCtrl.Delete(c, c.Param("jobId"))
	})

	// --- Job Postings (public) ---
	e.GET("/api/jobs", jobPostingCtrl.ListPublic)
	e.GET("/api/jobs/:jobId", func(c echo.Context) error {
		return jobPostingCtrl.GetPublic(c, c.Param("jobId"))
	})

	// --- Company Notifications ---
	companyNotifGroup := e.Group("/api/company/notifications", companyJwtMW)
	companyNotifGroup.GET("", notifCtrl.ListByCompany)
	companyNotifGroup.GET("/unread-count", notifCtrl.CountUnreadByCompany)
	companyNotifGroup.POST("/:id/read", func(c echo.Context) error {
		return notifCtrl.MarkAsRead(c, c.Param("id"))
	})
	companyNotifGroup.POST("/read-all", notifCtrl.MarkAllAsReadByCompany)

	// --- Candidate Scouts ---
	candidateScoutGroup := e.Group("/api/scouts", jwtMW)
	candidateScoutGroup.GET("", candidateScoutCtrl.List)
	candidateScoutGroup.GET("/:scoutId", func(c echo.Context) error {
		return candidateScoutCtrl.GetDetail(c, c.Param("scoutId"))
	})
	candidateScoutGroup.POST("/:scoutId/respond", func(c echo.Context) error {
		return candidateScoutCtrl.Respond(c, c.Param("scoutId"))
	})
	candidateScoutGroup.POST("/:scoutId/reply", func(c echo.Context) error {
		return candidateScoutCtrl.Reply(c, c.Param("scoutId"))
	})
	candidateScoutGroup.POST("/bulk-decline", candidateScoutCtrl.BulkDecline)

	// --- Scout Settings ---
	e.GET("/api/scout-settings", scoutSettingsCtrl.Get, jwtMW)
	e.PUT("/api/scout-settings", scoutSettingsCtrl.Update, jwtMW)

	// --- User Notifications ---
	userNotifGroup := e.Group("/api/notifications", jwtMW)
	userNotifGroup.GET("", notifCtrl.ListByUser)
	userNotifGroup.GET("/unread-count", notifCtrl.CountUnreadByUser)
	userNotifGroup.POST("/:id/read", func(c echo.Context) error {
		return notifCtrl.MarkAsRead(c, c.Param("id"))
	})
	userNotifGroup.POST("/read-all", notifCtrl.MarkAllAsReadByUser)

	// --- Candidate Job Applications ---
	candidateAppGroup := e.Group("/api/applications", jwtMW)
	candidateAppGroup.POST("", jobApplicationCtrl.Apply)
	candidateAppGroup.GET("", jobApplicationCtrl.ListByCandidate)
	candidateAppGroup.GET("/check", jobApplicationCtrl.CheckApplied)
	candidateAppGroup.POST("/:applicationId/withdraw", func(c echo.Context) error {
		return jobApplicationCtrl.Withdraw(c, c.Param("applicationId"))
	})

	// --- Company Job Applications ---
	companyAppGroup := e.Group("/api/company/applications", companyJwtMW)
	companyAppGroup.GET("", jobApplicationCtrl.ListByCompany)
	companyAppGroup.GET("/:applicationId", func(c echo.Context) error {
		return jobApplicationCtrl.GetByID(c, c.Param("applicationId"))
	})
	companyAppGroup.PATCH("/:applicationId/status", func(c echo.Context) error {
		return jobApplicationCtrl.UpdateStatus(c, c.Param("applicationId"))
	})

	// --- Candidate Messages ---
	candidateMsgGroup := e.Group("/api/messages", jwtMW)
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
	companyMsgGroup := e.Group("/api/company/messages", companyJwtMW)
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

	// --- WebSocket ---
	wsHub := ws.NewHub()
	go wsHub.Run()

	pgBroker := ws.NewPgMessageBroker(pool)
	participantRepoForRelay := participantRepoFactory()
	relay := ws.NewRelay(wsHub, pgBroker, participantRepoForRelay)
	go relay.Start(ctx)

	wsTickets := ws.NewTicketStore()
	wsCtrl := httpcontroller.NewWSController(wsHub, jwtService, wsTickets)
	e.GET("/api/ws/ticket", wsCtrl.IssueTicket)
	e.GET("/api/ws", wsCtrl.HandleWS)

	sched := scheduler.New(scoutMsgRepoFactory(), scoutCreditRepoFactory())
	sched.Start(ctx)

	return e, cfg, cleanup, nil
}
