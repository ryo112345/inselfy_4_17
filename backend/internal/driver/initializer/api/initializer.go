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
	"github.com/akiyama/inselfy/backend/internal/driver/config"
	driverdb "github.com/akiyama/inselfy/backend/internal/driver/db"
	"github.com/akiyama/inselfy/backend/internal/driver/factory"
	httpfactory "github.com/akiyama/inselfy/backend/internal/driver/factory/http"
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

	// --- Static uploads ---
	e.Static("/api/uploads", "./uploads")

	// --- Articles (public) ---
	articleGroup := e.Group("/api/articles")
	articleGroup.GET("", articleCtrl.List)
	articleGroup.GET("/:articleId", func(c echo.Context) error {
		return articleCtrl.GetByID(c, c.Param("articleId"))
	})

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

	// --- Team Diagnose (public) ---
	diagCtrl := httpcontroller.NewTeamDiagnoseController(pool)
	e.GET("/api/team-diagnose/:token", func(c echo.Context) error {
		return diagCtrl.GetByToken(c, c.Param("token"))
	})
	e.PUT("/api/team-diagnose/:token/status", func(c echo.Context) error {
		return diagCtrl.UpdateStatus(c, c.Param("token"))
	})

	// --- Admin ---
	adminUserCtrl := httpcontroller.NewAdminUserController(pool)
	adminReportCtrl := httpcontroller.NewAdminReportController(pool)
	adminCompanyCtrl := httpcontroller.NewAdminCompanyController(pool)
	adminGroup := e.Group("/api/admin")
	adminGroup.GET("/users", adminUserCtrl.List)
	adminGroup.GET("/companies", adminCompanyCtrl.List)
	adminGroup.PATCH("/companies/:id/status", func(c echo.Context) error {
		return adminCompanyCtrl.UpdateStatus(c, c.Param("id"))
	})
	adminGroup.DELETE("/users/:id", func(c echo.Context) error {
		return adminUserCtrl.Delete(c, c.Param("id"))
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

	return e, cfg, cleanup, nil
}
