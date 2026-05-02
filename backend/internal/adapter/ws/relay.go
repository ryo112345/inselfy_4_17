package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/akiyama/inselfy/backend/internal/port"
)

type Relay struct {
	hub      *Hub
	broker   port.MessageBroker
	convRepo port.ConversationRepository
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

func NewRelay(hub *Hub, broker port.MessageBroker, convRepo port.ConversationRepository) *Relay {
	return &Relay{hub: hub, broker: broker, convRepo: convRepo}
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

		conv, err := r.convRepo.GetByID(ctx, np.ConversationID)
		if err != nil {
			log.Printf("[relay] failed to get conversation %s: %v", np.ConversationID, err)
			continue
		}

		envelope, _ := json.Marshal(wsEnvelope{
			Type:    "new_message",
			Payload: payload,
		})

		candidateKey := fmt.Sprintf("candidate:%s", conv.CandidateID)
		companyKey := fmt.Sprintf("company:%s", conv.CompanyID)

		if np.SenderType != "candidate" || np.SenderID != conv.CandidateID {
			r.hub.Send(candidateKey, envelope)
		}
		if np.SenderType != "company" || np.SenderID != conv.CompanyID {
			r.hub.Send(companyKey, envelope)
		}
	}
}
