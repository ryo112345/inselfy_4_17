package ws

import (
	"log"
	"sync"
)

type Hub struct {
	mu         sync.RWMutex
	clients    map[string]map[*Client]struct{}
	register   chan *Client
	unregister chan *Client
	broadcast  chan BroadcastMessage
}

type BroadcastMessage struct {
	RecipientKey string
	Payload      []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]struct{}),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan BroadcastMessage, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			if h.clients[c.Key] == nil {
				h.clients[c.Key] = make(map[*Client]struct{})
			}
			h.clients[c.Key][c] = struct{}{}
			h.mu.Unlock()
			log.Printf("[ws] registered client key=%s", c.Key)

		case c := <-h.unregister:
			h.mu.Lock()
			if set, ok := h.clients[c.Key]; ok {
				delete(set, c)
				if len(set) == 0 {
					delete(h.clients, c.Key)
				}
			}
			h.mu.Unlock()
			close(c.Send)
			log.Printf("[ws] unregistered client key=%s", c.Key)

		case msg := <-h.broadcast:
			h.mu.RLock()
			if set, ok := h.clients[msg.RecipientKey]; ok {
				for c := range set {
					select {
					case c.Send <- msg.Payload:
					default:
						go func(dead *Client) { h.unregister <- dead }(c)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Register(c *Client)   { h.register <- c }
func (h *Hub) Unregister(c *Client) { h.unregister <- c }

func (h *Hub) Send(key string, data []byte) {
	h.broadcast <- BroadcastMessage{RecipientKey: key, Payload: data}
}
