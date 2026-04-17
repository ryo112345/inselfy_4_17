package db

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type txKey struct{}

// TxManager implements port.TxManager using pgxpool.
type TxManager struct {
	pool *pgxpool.Pool
}

// NewTxManager creates a transaction manager backed by a pgx pool.
func NewTxManager(pool *pgxpool.Pool) *TxManager {
	return &TxManager{pool: pool}
}

// WithinTransaction executes fn within a pgx transaction. The provided context
// carries the transaction handle, which repositories extract via TxFromContext
// so that all DB operations within fn share a single atomic unit of work.
func (m *TxManager) WithinTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return err
	}
	txCtx := context.WithValue(ctx, txKey{}, tx)

	if err := fn(txCtx); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}
	return tx.Commit(ctx)
}

// TxFromContext extracts a pgx.Tx if the context carries one.
func TxFromContext(ctx context.Context) pgx.Tx {
	if tx, ok := ctx.Value(txKey{}).(pgx.Tx); ok {
		return tx
	}
	return nil
}
