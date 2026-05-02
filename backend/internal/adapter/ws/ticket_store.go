package ws

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type TicketInfo struct {
	ParticipantType string
	ParticipantID   string
	ExpiresAt       time.Time
}

type TicketStore struct {
	mu      sync.Mutex
	tickets map[string]TicketInfo
}

func NewTicketStore() *TicketStore {
	return &TicketStore{tickets: make(map[string]TicketInfo)}
}

func (s *TicketStore) Issue(participantType, participantID string) string {
	b := make([]byte, 32)
	rand.Read(b)
	ticket := hex.EncodeToString(b)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.tickets[ticket] = TicketInfo{
		ParticipantType: participantType,
		ParticipantID:   participantID,
		ExpiresAt:       time.Now().Add(30 * time.Second),
	}
	return ticket
}

func (s *TicketStore) Consume(ticket string) (TicketInfo, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	info, ok := s.tickets[ticket]
	if !ok {
		return TicketInfo{}, false
	}
	delete(s.tickets, ticket)
	if time.Now().After(info.ExpiresAt) {
		return TicketInfo{}, false
	}
	return info, true
}
