package ws

import (
	"context"
	"log"
	"time"

	"github.com/coder/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = 50 * time.Second
	maxMsgSize = 4096
)

type Client struct {
	Hub  *Hub
	Conn *websocket.Conn
	Key  string
	Send chan []byte
	ctx  context.Context
}

func NewClient(ctx context.Context, hub *Hub, conn *websocket.Conn, key string) *Client {
	return &Client{
		Hub:  hub,
		Conn: conn,
		Key:  key,
		Send: make(chan []byte, 64),
		ctx:  ctx,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close(websocket.StatusNormalClosure, "")
	}()

	c.Conn.SetReadLimit(maxMsgSize)

	for {
		_, _, err := c.Conn.Read(c.ctx)
		if err != nil {
			if websocket.CloseStatus(err) == websocket.StatusNormalClosure {
				log.Printf("[ws] client %s closed normally", c.Key)
			}
			return
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close(websocket.StatusNormalClosure, "")
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				return
			}
			ctx, cancel := context.WithTimeout(c.ctx, writeWait)
			err := c.Conn.Write(ctx, websocket.MessageText, msg)
			cancel()
			if err != nil {
				return
			}

		case <-ticker.C:
			ctx, cancel := context.WithTimeout(c.ctx, writeWait)
			err := c.Conn.Ping(ctx)
			cancel()
			if err != nil {
				return
			}

		case <-c.ctx.Done():
			return
		}
	}
}
