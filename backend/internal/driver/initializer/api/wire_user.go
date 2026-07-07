package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireUser registers user profile routes and their sub-resources
// (experiences, educations, skills, follow, similar users).
func wireUser(e *echo.Echo, d *deps, jwtMW echo.MiddlewareFunc) {
	userCtrl := httpcontroller.NewUserController(usecase.NewUserInteractor(d.userRepo), d.fileStorage)
	experienceCtrl := httpcontroller.NewExperienceController(usecase.NewExperienceInteractor(
		sqlcgw.NewExperienceRepository(d.pool), d.userRepo,
	))
	educationCtrl := httpcontroller.NewEducationController(usecase.NewEducationInteractor(
		sqlcgw.NewEducationRepository(d.pool), d.userRepo,
	))
	skillCtrl := httpcontroller.NewSkillController(usecase.NewSkillInteractor(
		sqlcgw.NewSkillRepository(d.pool), d.userRepo, d.tx,
	))
	followCtrl := httpcontroller.NewFollowController(usecase.NewFollowInteractor(
		sqlcgw.NewFollowRepository(d.pool), d.userRepo,
	))
	similarUsersCtrl := httpcontroller.NewSimilarUsersController(
		usecase.NewSimilarUsersInteractor(sqlcgw.NewSimilarUsersQueryService(d.pool)),
	)

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
	e.POST("/api/users/:username/upload-image", func(c echo.Context) error {
		return userCtrl.UploadImage(c, c.Param("username"))
	}, jwtMW)

	// --- Similar Users ---
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
}
