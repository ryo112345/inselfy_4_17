package initializer

// DI wiring is split by feature across sibling wire_*.go files. This file
// keeps the server skeleton: config/pool setup, middleware order, and the
// calls into each feature's wiring function. Auth is spec-driven: the OpenAPI
// validator middleware enforces the spec's security requirements (including
// AdminAuth for /api/admin), so wire functions register plain routes.

import (
	"context"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

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

func BuildServer(ctx context.Context) (http.Handler, *config.Config, func(), error) {
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

	sr := newStrictRouter()
	interviewCtrl, wsHub, err := registerRoutes(ctx, sr, d)
	if err != nil {
		cleanup()
		return nil, nil, func() {}, err
	}

	// Validate requests against the API contract (body schema, params, enums)
	// and enforce the spec's security requirements (spec-driven auth,
	// including AdminAuth); see docs/strict-server-migration.md Phase 1-2.
	oapiValidator, err := authmw.OpenAPIRequestValidator(openapigen.SpecYAML, jwtService, pool, cfg.AdminAPIKey, cfg.ValidateResponses)
	if err != nil {
		cleanup()
		return nil, nil, func() {}, err
	}

	// Middleware chain, outermost first — the same order as the echo chain
	// this replaced: Recover → RequestLogging (structured access log + Cloud
	// Trace correlation) → OpenAPI validation/auth → CORS → router.
	var handler http.Handler = sr
	handler = authmw.CORS(authmw.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch, http.MethodOptions},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
	})(handler)
	handler = oapiValidator(handler)
	handler = authmw.RequestLogging(cfg.GoogleCloudProject)(handler)
	handler = authmw.Recover()(handler)

	// --- Background goroutines (not needed for route registration) ---
	go wsHub.Run()

	interviewCtrl.SetWS(wsHub)

	pgBroker := ws.NewPgMessageBroker(pool)
	relay := ws.NewRelay(wsHub, pgBroker, d.participantRepo)
	go relay.Start(ctx)

	sched := scheduler.New(d.scoutMsgRepo, sqlcgw.NewScoutCreditRepository(pool))
	sched.Start(ctx)

	return handler, cfg, cleanup, nil
}

// registerRoutes wires every route the server exposes onto sr: DI assembly
// via the wire_*.go files, then the generated HandlerWithOptions registers
// all spec routes (spec→router coverage is guaranteed by codegen), and the
// spec-external routes (uploads, health, WS; the Stripe webhook lives in
// wireContent) are added by hand. Split out from BuildServer so tests can
// build the full route table without a live DB or background goroutines
// (see spec_drift_test.go).
func registerRoutes(ctx context.Context, sr *strictRouter, d *deps) (*httpcontroller.InterviewController, *ws.Hub, error) {
	// 認可はスペック駆動: openapi.yaml の security 定義を OpenAPIRequestValidator
	// が検証する（middleware/openapi_validator.go）。/api/admin の AdminAuth も
	// 含め、per-route の認証MWは無い。

	strictSrv := httpcontroller.NewStrictServer()

	// --- Static uploads（スペック外・echo e.Static 相当）---
	// http.Dir が path traversal を遮断し、ディレクトリは echo と同じく 404。
	uploadsRoot := http.Dir("./uploads")
	sr.handle("GET /api/uploads/{path...}", func(w http.ResponseWriter, r *http.Request) {
		f, err := uploadsRoot.Open(r.PathValue("path"))
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"message": http.StatusText(http.StatusNotFound)})
			return
		}
		defer func() { _ = f.Close() }()
		st, err := f.Stat()
		if err != nil || st.IsDir() {
			writeJSON(w, http.StatusNotFound, map[string]string{"message": http.StatusText(http.StatusNotFound)})
			return
		}
		http.ServeContent(w, r, st.Name(), st.ModTime(), f)
	})

	wireHealth(sr, d.pool)
	wireAuth(strictSrv, d)
	wireUser(sr, strictSrv, d)
	wireContent(sr, strictSrv, d)
	wireSearch(strictSrv, d)
	wireDiagnosis(strictSrv, d)
	wireCompany(strictSrv, d)
	wireScout(strictSrv, d)
	wireJobs(strictSrv, d)
	wireMessaging(strictSrv, d)
	interviewCtrl := wireInterview(strictSrv, d)
	if err := wireAdmin(ctx, strictSrv, d); err != nil {
		return nil, nil, err
	}

	// 全スペックルートを生成コードに登録させる（sr が BaseRouter）。
	// RequestIntoContext: auth 系 handler が cookie 読取り・Secure 判定に使う
	// *http.Request を context 経由で渡す（strict 署名には現れない）。
	strictHandler := openapigen.NewStrictHandlerWithOptions(strictSrv,
		[]openapigen.StrictMiddlewareFunc{httpcontroller.RequestIntoContext},
		openapigen.StrictHTTPServerOptions{
			RequestErrorHandlerFunc:  httpcontroller.WriteRequestError,
			ResponseErrorHandlerFunc: httpcontroller.WriteResponseError,
		})
	openapigen.HandlerWithOptions(strictHandler, openapigen.StdHTTPServerOptions{
		BaseRouter:       sr,
		ErrorHandlerFunc: httpcontroller.WriteRequestError,
	})

	// --- WebSocket（スペック外）---
	wsHub := ws.NewHub()
	wsTickets := ws.NewTicketStore()
	wsCtrl := httpcontroller.NewWSController(wsHub, d.jwtService, wsTickets)
	sr.handle("GET /api/ws/ticket", wsCtrl.IssueTicket)
	sr.handle("GET /api/ws", wsCtrl.HandleWS)

	return interviewCtrl, wsHub, nil
}
