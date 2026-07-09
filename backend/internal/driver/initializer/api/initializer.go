package initializer

// DI wiring is split by feature across sibling wire_*.go files. This file
// keeps the server skeleton: config/pool setup, middleware order, and the
// calls into each feature's wiring function. Each wire function receives the
// shared deps plus, explicitly in its signature, the auth middlewares its
// routes need.

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	jwtgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/jwt"
	storagegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/storage"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	ws "github.com/akiyama/inselfy/backend/internal/adapter/ws"
	"github.com/akiyama/inselfy/backend/internal/driver/config"
	driverdb "github.com/akiyama/inselfy/backend/internal/driver/db"
	"github.com/akiyama/inselfy/backend/internal/driver/scheduler"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// deps bundles the dependencies shared across feature wiring files.
// Auth middlewares are intentionally NOT part of deps: each wire function
// declares the ones it uses in its signature.
type deps struct {
	cfg  *config.Config
	pool *pgxpool.Pool
	tx   port.TxManager

	jwtService  port.JWTService
	fileStorage port.FileStorage

	// Repositories shared by multiple interactors/controllers.
	userRepo         port.UserRepository
	notificationRepo port.NotificationRepository
	jobPostingRepo   port.JobPostingRepository
	scoutMsgRepo     port.ScoutMessageRepository
	convRepo         port.ConversationRepository
	msgRepo          port.MessageRepository
	participantRepo  port.ConversationParticipantRepository
}

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

	jwtService := jwtgw.NewService(cfg.JWTSecret)

	var fileStorage port.FileStorage
	if cfg.StorageBackend == "r2" {
		fileStorage = storagegw.NewR2(cfg.R2AccountID, cfg.R2AccessKeyID, cfg.R2SecretAccessKey, cfg.R2Bucket, cfg.R2PublicURL)
	} else {
		fileStorage = storagegw.NewLocal("./uploads", "/api/uploads")
	}

	d := &deps{
		cfg:  cfg,
		pool: pool,
		tx:   driverdb.NewTxManager(pool),

		jwtService:  jwtService,
		fileStorage: fileStorage,

		userRepo:         sqlcgw.NewUserRepository(pool),
		notificationRepo: sqlcgw.NewNotificationRepository(pool),
		jobPostingRepo:   sqlcgw.NewJobPostingRepository(pool),
		scoutMsgRepo:     sqlcgw.NewScoutMessageRepository(pool),
		convRepo:         sqlcgw.NewConversationRepository(pool),
		msgRepo:          sqlcgw.NewMessageRepository(pool),
		participantRepo:  sqlcgw.NewConversationParticipantRepository(pool),
	}

	e := echo.New()
	e.Use(echomw.Recover())
	e.Use(echomw.Logger())

	// Validate requests against the API contract (body schema, params, enums).
	// Routes outside the spec pass through; auth stays with the middlewares below.
	oapiValidator, err := authmw.OpenAPIRequestValidator(openapigen.SpecYAML)
	if err != nil {
		cleanup()
		return nil, nil, func() {}, err
	}
	e.Use(oapiValidator)

	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{echo.GET, echo.POST, echo.PUT, echo.DELETE, echo.PATCH, echo.OPTIONS},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))

	interviewCtrl, wsHub, err := registerRoutes(ctx, e, d)
	if err != nil {
		cleanup()
		return nil, nil, func() {}, err
	}

	// --- Background goroutines (not needed for route registration) ---
	go wsHub.Run()

	interviewCtrl.SetWS(wsHub)

	pgBroker := ws.NewPgMessageBroker(pool)
	relay := ws.NewRelay(wsHub, pgBroker, d.participantRepo)
	go relay.Start(ctx)

	sched := scheduler.New(d.scoutMsgRepo, sqlcgw.NewScoutCreditRepository(pool))
	sched.Start(ctx)

	return e, cfg, cleanup, nil
}

// registerRoutes wires every route the server exposes onto e. Split out from
// BuildServer so tests can build the full route table without a live DB or
// background goroutines (see spec_drift_test.go).
func registerRoutes(ctx context.Context, e *echo.Echo, d *deps) (*httpcontroller.InterviewController, *ws.Hub, error) {
	jwtMW := authmw.JWTAuth(d.jwtService)
	optionalJwtMW := authmw.OptionalJWTAuth(d.jwtService)
	companyJwtMW := authmw.CompanyJWTAuth(d.jwtService)
	// 書き込みは本人（候補者JWT）のみ、読み取りはログイン済みの候補者/企業どちらでも可
	anyJwtMW := authmw.AnyJWTAuth(d.jwtService)

	// --- Static uploads ---
	e.Static("/api/uploads", "./uploads")

	wireHealth(e, d.pool)
	wireAuth(e, d, jwtMW, companyJwtMW)
	wireUser(e, d, jwtMW)
	wireContent(e, d, jwtMW, optionalJwtMW, companyJwtMW)
	wireDiagnosis(e, d, jwtMW, anyJwtMW)
	wireCompany(e, d, companyJwtMW)
	wireScout(e, d, jwtMW, companyJwtMW)
	wireJobs(e, d, jwtMW, companyJwtMW)
	wireMessaging(e, d, jwtMW, companyJwtMW)
	interviewCtrl := wireInterview(e, d, jwtMW, companyJwtMW)
	if err := wireAdmin(ctx, e, d, jwtMW, anyJwtMW); err != nil {
		return nil, nil, err
	}

	// --- WebSocket ---
	wsHub := ws.NewHub()
	wsTickets := ws.NewTicketStore()
	wsCtrl := httpcontroller.NewWSController(wsHub, d.jwtService, wsTickets)
	e.GET("/api/ws/ticket", wsCtrl.IssueTicket)
	e.GET("/api/ws", wsCtrl.HandleWS)

	return interviewCtrl, wsHub, nil
}
