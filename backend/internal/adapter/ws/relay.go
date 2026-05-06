package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/akiyama/inselfy/backend/internal/port"
)

type Relay struct {
	hub             *Hub
	broker          port.MessageBroker
	participantRepo port.ConversationParticipantRepository
}

type notifyPayload struct {
	ConversationID string `json:"conversation_id"`
	MessageID      string `json:"message_id"`
	SenderType     string `json:"sender_type"`
	SenderID       string `json:"sender_id"`
}

type wsEnvelope struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func NewRelay(hub *Hub, broker port.MessageBroker, participantRepo port.ConversationParticipantRepository) *Relay {
	return &Relay{hub: hub, broker: broker, participantRepo: participantRepo}
}

func (r *Relay) Start(ctx context.Context) {
	ch, cancel, err := r.broker.Subscribe(ctx, "new_message")
	if err != nil {
		log.Printf("[relay] failed to subscribe: %v", err)
		return
	}
	defer cancel()

	log.Println("[relay] listening for new_message notifications")

	for payload := range ch {
		var np notifyPayload
		if err := json.Unmarshal(payload, &np); err != nil {
			log.Printf("[relay] invalid payload: %v", err)
			continue
		}

		participants, err := r.participantRepo.ListByConversation(ctx, np.ConversationID)
		if err != nil {
			log.Printf("[relay] failed to list participants for %s: %v", np.ConversationID, err)
			continue
		}

		envelope, _ := json.Marshal(wsEnvelope{
			Type:    "new_message",
			Payload: payload,
		})

		for _, p := range participants {
			if p.ParticipantType == np.SenderType && p.ParticipantID == np.SenderID {
				continue
			}
			key := fmt.Sprintf("%s:%s", p.ParticipantType, p.ParticipantID)
			r.hub.Send(key, envelope)
		}
	}
}
