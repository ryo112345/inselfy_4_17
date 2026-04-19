package initializer

import (
	"context"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	googlegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/google"
	jwtgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/jwt"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/driver/config"
	driverdb "github.com/akiyama/inselfy/backend/internal/driver/db"
	"github.com/akiyama/inselfy/backend/internal/driver/factory"
	httpfactory "github.com/akiyama/inselfy/backend/internal/driver/factory/http"
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

	userInputFactory := factory.NewUserInputFactory()
	authInputFactory := factory.NewAuthInputFactory(googleVerifier, jwtService, cfg.GoogleClientID)
	experienceInputFactory := factory.NewExperienceInputFactory()
	educationInputFactory := factory.NewEducationInputFactory()
	skillInputFactory := factory.NewSkillInputFactory()
	postInputFactory := factory.NewPostInputFactory()
	wvInputFactory := factory.NewWorkValuesInputFactory()
	ciInputFactory := factory.NewCareerInterestInputFactory()

	userOutputFactory := httpfactory.NewUserOutputFactory()
	authOutputFactory := httpfactory.NewAuthOutputFactory()
	experienceOutputFactory := httpfactory.NewExperienceOutputFactory()
	educationOutputFactory := httpfactory.NewEducationOutputFactory()
	skillOutputFactory := httpfactory.NewSkillOutputFactory()
	postOutputFactory := httpfactory.NewPostOutputFactory()
	wvOutputFactory := httpfactory.NewWorkValuesOutputFactory()
	ciOutputFactory := httpfactory.NewCareerInterestOutputFactory()

	userCtrl := httpcontroller.NewUserController(userInputFactory, userOutputFactory, userRepoFactory)
	authCtrl := httpcontroller.NewAuthController(authInputFactory, authOutputFactory, userRepoFactory, refreshTokenRepoFactory)
	experienceCtrl := httpcontroller.NewExperienceController(experienceInputFactory, experienceOutputFactory, experienceRepoFactory, userRepoFactory)
	educationCtrl := httpcontroller.NewEducationController(educationInputFactory, educationOutputFactory, educationRepoFactory, userRepoFactory)
	skillCtrl := httpcontroller.NewSkillController(skillInputFactory, skillOutputFactory, skillRepoFactory, userRepoFactory, tx)
	postCtrl := httpcontroller.NewPostController(postInputFactory, postOutputFactory, postRepoFactory)
	wvCtrl := httpcontroller.NewWorkValuesController(wvInputFactory, wvOutputFactory, wvSessionRepoFactory, wvResultRepoFactory, wvScoreRepoFactory)
	ciCtrl := httpcontroller.NewCareerInterestController(ciInputFactory, ciOutputFactory, ciSessionRepoFactory, ciResultRepoFactory, ciBasicScoreRepoFactory, ciTypeScoreRepoFactory)

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

	// --- Admin ---
	adminUserCtrl := httpcontroller.NewAdminUserController(pool)
	adminReportCtrl := httpcontroller.NewAdminReportController(pool)
	adminGroup := e.Group("/api/admin")
	adminGroup.GET("/users", adminUserCtrl.List)
	adminGroup.DELETE("/users/:id", func(c echo.Context) error {
		return adminUserCtrl.Delete(c, c.Param("id"))
	})
	adminGroup.GET("/reports/pending", adminReportCtrl.ListPending)
	adminGroup.PUT("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.SaveReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.GetReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/sessions/:sessionId/scores", func(c echo.Context) error {
		return adminReportCtrl.GetSessionScores(c, c.Param("sessionId"))
	})

	// --- AI Report (user-facing) ---
	wvGroup.GET("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.GetReport(c, c.Param("sessionId"))
	})

	return e, cfg, cleanup, nil
}
