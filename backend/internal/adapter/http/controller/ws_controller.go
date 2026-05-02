package controller

import (
	"fmt"
	"log"
	"net/http"

	"github.com/coder/websocket"
	"github.com/labstack/echo/v4"

	ws "github.com/akiyama/inselfy/backend/internal/adapter/ws"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WSController struct {
	hub        *ws.Hub
	jwtService port.JWTService
}

func NewWSController(hub *ws.Hub, jwtService port.JWTService) *WSController {
	return &WSController{hub: hub, jwtService: jwtService}
}

func (c *WSController) HandleWS(ctx echo.Context) error {
	participantType := ctx.QueryParam("type")
	if participantType != "candidate" && participantType != "company" {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "type query param is required (candidate|company)"})
	}

	var token string
	switch participantType {
	case "candidate":
		if ck, err := ctx.Cookie("inselfy_token"); err == nil {
			token = ck.Value
		}
	case "company":
		if ck, err := ctx.Cookie("company_token"); err == nil {
			token = ck.Value
		}
	}
	if token == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{"message": "not authenticated"})
	}

	var id string
	var err error
	switch participantType {
	case "candidate":
		id, err = c.jwtService.ValidateAccessToken(token)
	case "company":
		id, err = c.jwtService.ValidateCompanyAccessToken(token)
	}
	if err != nil || id == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{"message": "invalid token"})
	}

	conn, err := websocket.Accept(ctx.Response(), ctx.Request(), &websocket.AcceptOptions{
		OriginPatterns: []string{"localhost:*", "127.0.0.1:*"},
	})
	if err != nil {
		log.Printf("[ws] accept error: %v", err)
		return nil
	}

	key := fmt.Sprintf("%s:%s", participantType, id)
	client := ws.NewClient(ctx.Request().Context(), c.hub, conn, key)
	c.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()

	return nil
}
