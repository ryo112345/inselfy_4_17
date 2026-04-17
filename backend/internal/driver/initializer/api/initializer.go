// Package initializer wires dependencies for the API server.
package initializer

import (
	"context"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/driver/config"
	driverdb "github.com/akiyama/inselfy/backend/internal/driver/db"
	"github.com/akiyama/inselfy/backend/internal/driver/factory"
	httpfactory "github.com/akiyama/inselfy/backend/internal/driver/factory/http"
)

// BuildServer composes dependencies and returns an Echo server, config, and cleanup function.
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

	userRepoFactory := factory.NewUserRepoFactory(pool)
	experienceRepoFactory := factory.NewExperienceRepoFactory(pool)
	educationRepoFactory := factory.NewEducationRepoFactory(pool)
	skillRepoFactory := factory.NewSkillRepoFactory(pool)

	userInputFactory := factory.NewUserInputFactory()
	experienceInputFactory := factory.NewExperienceInputFactory()
	educationInputFactory := factory.NewEducationInputFactory()
	skillInputFactory := factory.NewSkillInputFactory()

	userOutputFactory := httpfactory.NewUserOutputFactory()
	experienceOutputFactory := httpfactory.NewExperienceOutputFactory()
	educationOutputFactory := httpfactory.NewEducationOutputFactory()
	skillOutputFactory := httpfactory.NewSkillOutputFactory()

	userCtrl := httpcontroller.NewUserController(userInputFactory, userOutputFactory, userRepoFactory)
	experienceCtrl := httpcontroller.NewExperienceController(experienceInputFactory, experienceOutputFactory, experienceRepoFactory, userRepoFactory)
	educationCtrl := httpcontroller.NewEducationController(educationInputFactory, educationOutputFactory, educationRepoFactory, userRepoFactory)
	skillCtrl := httpcontroller.NewSkillController(skillInputFactory, skillOutputFactory, skillRepoFactory, userRepoFactory, tx)

	e := echo.New()
	e.Use(echomw.Recover())
	e.Use(echomw.Logger())
	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE, echo.PATCH, echo.OPTIONS},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	server := httpcontroller.NewServer(userCtrl, experienceCtrl, educationCtrl, skillCtrl)
	openapi.RegisterHandlers(e, server)

	return e, cfg, cleanup, nil
}
