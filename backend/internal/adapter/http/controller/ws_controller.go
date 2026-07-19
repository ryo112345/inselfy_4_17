package controller

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/coder/websocket"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	ws "github.com/akiyama/inselfy/backend/internal/adapter/ws"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WSController struct {
	hub        *ws.Hub
	jwtService port.JWTService
	tickets    *ws.TicketStore
}

func NewWSController(hub *ws.Hub, jwtService port.JWTService, tickets *ws.TicketStore) *WSController {
	return &WSController{hub: hub, jwtService: jwtService, tickets: tickets}
}

// unauthorizedJSON renders the canonical 401 body for the spec-external WS
// routes (they bypass the spec-driven validator, so auth stays hand-rolled).
func unauthorizedJSON(w http.ResponseWriter, message string) {
	writeJSON(w, http.StatusUnauthorized, openapi.ModelsErrorResponse{Code: "UNAUTHORIZED", Message: message})
}

// validateParticipant resolves and validates the token cookie for the given
// participant type; it returns the authenticated principal ID or "".
func (c *WSController) validateParticipant(r *http.Request, participantType string) string {
	var cookieName string
	var validate func(string) (string, error)
	switch participantType {
	case "candidate":
		cookieName, validate = "inselfy_token", c.jwtService.ValidateAccessToken
	case "company":
		cookieName, validate = "company_token", c.jwtService.ValidateCompanyAccessToken
	default:
		return ""
	}
	ck, err := r.Cookie(cookieName)
	if err != nil || ck.Value == "" {
		return ""
	}
	id, err := validate(ck.Value)
	if err != nil {
		return ""
	}
	return id
}

func (c *WSController) IssueTicket(w http.ResponseWriter, r *http.Request) {
	participantType := r.URL.Query().Get("type")
	if participantType != "candidate" && participantType != "company" {
		writeJSON(w, http.StatusBadRequest, badRequestBody("type is required (candidate|company)"))
		return
	}

	id := c.validateParticipant(r, participantType)
	if id == "" {
		unauthorizedJSON(w, "not authenticated")
		return
	}

	ticket := c.tickets.Issue(participantType, id)
	writeJSON(w, http.StatusOK, map[string]string{"ticket": ticket})
}

func (c *WSController) HandleWS(w http.ResponseWriter, r *http.Request) {
	var participantType, id string

	if ticket := r.URL.Query().Get("ticket"); ticket != "" {
		info, ok := c.tickets.Consume(ticket)
		if !ok {
			unauthorizedJSON(w, "invalid or expired ticket")
			return
		}
		participantType = info.ParticipantType
		id = info.ParticipantID
	} else {
		participantType = r.URL.Query().Get("type")
		if participantType != "candidate" && participantType != "company" {
			writeJSON(w, http.StatusBadRequest, badRequestBody("type query param is required (candidate|company)"))
			return
		}

		id = c.validateParticipant(r, participantType)
		if id == "" {
			unauthorizedJSON(w, "not authenticated")
			return
		}
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"localhost:*", "127.0.0.1:*"},
	})
	if err != nil {
		log.Printf("[ws] accept error: %v", err)
		return
	}

	key := fmt.Sprintf("%s:%s", participantType, id)
	client := ws.NewClient(context.Background(), c.hub, conn, key)
	c.hub.Register(client)

	go client.WritePump()
	client.ReadPump() // blocks until connection closes
}
