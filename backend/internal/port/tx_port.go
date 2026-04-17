package port

import "context"

// TxManager controls transaction boundaries. Repositories participating in a
// transaction lookup the active handle from the context; callers compose
// multi-table writes by wrapping them in WithinTransaction.
type TxManager interface {
	WithinTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}
