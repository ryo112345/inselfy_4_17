// Package sqlc implements gateway repositories backed by sqlc-generated code.
package sqlc

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	driverdb "github.com/akiyama/inselfy/backend/internal/driver/db"
)

// queriesForContext returns a *generated.Queries bound to the ambient
// transaction (if any) or falls back to the pool-level queries.
func queriesForContext(ctx context.Context, q *generated.Queries) *generated.Queries {
	if tx := driverdb.TxFromContext(ctx); tx != nil {
		return q.WithTx(tx)
	}
	return q
}

func parseUUID(s string) (pgtype.UUID, error) {
	parsed, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, err
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}, nil
}

func uuidToString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	return uuid.UUID(id.Bytes).String()
}

func textPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	s := t.String
	return &s
}

func pgText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func pgBool(b *bool) pgtype.Bool {
	if b == nil {
		return pgtype.Bool{}
	}
	return pgtype.Bool{Bool: *b, Valid: true}
}

func int2Ptr(v pgtype.Int2) *int16 {
	if !v.Valid {
		return nil
	}
	n := v.Int16
	return &n
}

func pgInt2(v *int16) pgtype.Int2 {
	if v == nil {
		return pgtype.Int2{}
	}
	return pgtype.Int2{Int16: *v, Valid: true}
}
