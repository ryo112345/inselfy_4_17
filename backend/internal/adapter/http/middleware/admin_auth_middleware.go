package middleware

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
)

// AdminIDKey holds the authenticated admin's ID when a personal token was
// used. It is unset when the static bootstrap key was used.
const AdminIDKey = "adminID"

// AdminAuth validates the X-Admin-Key header against either the static
// bootstrap key (ADMIN_API_KEY) or a personal token stored hashed in the
// admins table. Fail-closed: with no key configured and no admins registered,
// every request is rejected.
func AdminAuth(pool *pgxpool.Pool, staticKey string) echo.MiddlewareFunc {
	queries := generated.New(pool)
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			key := c.Request().Header.Get("X-Admin-Key")
			if key == "" {
				return c.JSON(http.StatusUnauthorized, unauthorizedResponse)
			}
			if staticKey != "" && subtle.ConstantTimeCompare([]byte(key), []byte(staticKey)) == 1 {
				return next(c)
			}
			sum := sha256.Sum256([]byte(key))
			hash := pgtype.Text{String: hex.EncodeToString(sum[:]), Valid: true}
			admin, err := queries.GetAdminByAPIKeyHash(c.Request().Context(), hash)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, unauthorizedResponse)
			}
			_ = queries.TouchAdminLastUsed(c.Request().Context(), admin.ID)
			c.Set(AdminIDKey, admin.ID)
			return next(c)
		}
	}
}
