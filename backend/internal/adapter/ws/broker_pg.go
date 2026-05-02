package ws

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/port"
)

type PgMessageBroker struct {
	pool *pgxpool.Pool
}

var _ port.MessageBroker = (*PgMessageBroker)(nil)

func NewPgMessageBroker(pool *pgxpool.Pool) *PgMessageBroker {
	return &PgMessageBroker{pool: pool}
}

func (b *PgMessageBroker) Publish(ctx context.Context, channel string, payload []byte) error {
	conn, err := b.pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()
	_, err = conn.Exec(ctx, "SELECT pg_notify($1, $2)", channel, string(payload))
	return err
}

func (b *PgMessageBroker) Subscribe(ctx context.Context, channel string) (<-chan []byte, func(), error) {
	conn, err := b.pool.Acquire(ctx)
	if err != nil {
		return nil, nil, err
	}

	_, err = conn.Exec(ctx, "LISTEN "+channel)
	if err != nil {
		conn.Release()
		return nil, nil, err
	}

	ch := make(chan []byte, 64)
	cancelCtx, cancelFn := context.WithCancel(ctx)

	go func() {
		defer conn.Release()
		defer close(ch)
		for {
			notification, err := conn.Conn().WaitForNotification(cancelCtx)
			if err != nil {
				if cancelCtx.Err() != nil {
					return
				}
				log.Printf("[broker] WaitForNotification error: %v", err)
				return
			}
			select {
			case ch <- []byte(notification.Payload):
			case <-cancelCtx.Done():
				return
			}
		}
	}()

	return ch, cancelFn, nil
}
