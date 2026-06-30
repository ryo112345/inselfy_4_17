package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	sqlcrepo "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/domain/interview"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WSNotifier interface {
	Send(key string, data []byte)
}

type InterviewController struct {
	pool            *pgxpool.Pool
	proposalRepo    port.InterviewProposalRepository
	slotRepo        port.InterviewSlotRepository
	interviewRepo   port.InterviewRepository
	msgRepo         port.MessageRepository
	convRepo        port.ConversationRepository
	participantRepo port.ConversationParticipantRepository
	tx              port.TxManager
	ws              WSNotifier
}

func NewInterviewController(
	pool *pgxpool.Pool,
	convRepo port.ConversationRepository,
	msgRepo port.MessageRepository,
	participantRepo port.ConversationParticipantRepository,
	tx port.TxManager,
) *InterviewController {
	return &InterviewController{
		pool:            pool,
		proposalRepo:    sqlcrepo.NewInterviewProposalRepository(pool),
		slotRepo:        sqlcrepo.NewInterviewSlotRepository(pool),
		interviewRepo:   sqlcrepo.NewInterviewRepository(pool),
		msgRepo:         msgRepo,
		convRepo:        convRepo,
		participantRepo: participantRepo,
		tx:              tx,
	}
}

func (ctrl *InterviewController) SetWS(ws WSNotifier) {
	ctrl.ws = ws
}

type proposeRequest struct {
	ApplicationID   string `json:"applicationId"`
	Message         string `json:"message"`
	Location        string `json:"location"`
	DurationMinutes int    `json:"durationMinutes"`
	Slots           []struct {
		StartTime string `json:"startTime"`
		EndTime   string `json:"endTime"`
	} `json:"slots"`
	ExpiresInDays int `json:"expiresInDays"`
}

func (ctrl *InterviewController) Propose(c echo.Context) error {
	companyID := authmw.CompanyID(c)

	var req proposeRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request")
	}

	if len(req.Slots) == 0 {
		return badRequest(c, "at least one slot is required")
	}
	if len(req.Slots) > 10 {
		return badRequest(c, "maximum 10 slots")
	}

	slots := make([]interview.SlotInput, len(req.Slots))
	for i, s := range req.Slots {
		start, err := time.Parse(time.RFC3339, s.StartTime)
		if err != nil {
			return badRequest(c, "invalid start time")
		}
		end, err := time.Parse(time.RFC3339, s.EndTime)
		if err != nil {
			return badRequest(c, "invalid end time")
		}
		if !end.After(start) {
			return badRequest(c, "end time must be after start time")
		}
		slots[i] = interview.SlotInput{StartTime: start, EndTime: end}
	}

	// Look up application to get candidateID
	var candidateID string
	row := ctrl.pool.QueryRow(c.Request().Context(),
		"SELECT candidate_id FROM job_applications WHERE id = $1 AND company_id = $2", req.ApplicationID, companyID)
	if err := row.Scan(&candidateID); err != nil {
		return notFoundError(c, "application not found")
	}

	expiresInDays := req.ExpiresInDays
	if expiresInDays <= 0 {
		expiresInDays = 7
	}

	durationMinutes := req.DurationMinutes
	if durationMinutes <= 0 {
		durationMinutes = 60
	}

	ctx := c.Request().Context()
	var proposal *interview.Proposal
	var createdSlots []*interview.Slot
	var cancelledProposals []*interview.Proposal

	err := ctrl.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		// Cancel any existing pending proposals for this application
		cancelled, _ := ctrl.proposalRepo.CancelPendingByApplication(txCtx, req.ApplicationID)
		cancelledProposals = cancelled

		var txErr error
		proposal, txErr = ctrl.proposalRepo.Create(txCtx, &interview.Proposal{
			ApplicationID:   req.ApplicationID,
			CompanyID:       companyID,
			CandidateID:     candidateID,
			Message:         req.Message,
			DurationMinutes: durationMinutes,
			Status:          "pending",
			ExpiresAt:       time.Now().Add(time.Duration(expiresInDays) * 24 * time.Hour),
		})
		if txErr != nil {
			return txErr
		}

		createdSlots = make([]*interview.Slot, len(slots))
		for i, s := range slots {
			slot, err := ctrl.slotRepo.Create(txCtx, &interview.Slot{
				ProposalID:    proposal.ID,
				ApplicationID: req.ApplicationID,
				ProposedBy:    companyID,
				StartTime:     s.StartTime,
				EndTime:       s.EndTime,
				Status:        "proposed",
			})
			if err != nil {
				return err
			}
			createdSlots[i] = slot
		}

		// Find or create conversation
		conv, err := ctrl.convRepo.GetByCompanyAndCandidate(txCtx, companyID, candidateID)
		if err != nil {
			conv, err = ctrl.convRepo.Create(txCtx, &messaging.Conversation{
				CompanyID:   companyID,
				CandidateID: candidateID,
			})
			if err != nil {
				return err
			}
			if err := ctrl.participantRepo.Create(txCtx, &messaging.ConversationParticipant{
				ConversationID:  conv.ID,
				ParticipantType: "company",
				ParticipantID:   companyID,
			}); err != nil {
				return err
			}
			if err := ctrl.participantRepo.Create(txCtx, &messaging.ConversationParticipant{
				ConversationID:  conv.ID,
				ParticipantType: "candidate",
				ParticipantID:   candidateID,
			}); err != nil {
				return err
			}
		}

		// Build structured message metadata
		slotData := make([]map[string]string, len(createdSlots))
		for i, s := range createdSlots {
			slotData[i] = map[string]string{
				"id":         s.ID,
				"start_time": s.StartTime.Format(time.RFC3339),
				"end_time":   s.EndTime.Format(time.RFC3339),
			}
		}
		metadata := map[string]interface{}{
			"proposal_id":      proposal.ID,
			"slots":            slotData,
			"location":         req.Location,
			"duration_minutes": durationMinutes,
			"expires_at":       proposal.ExpiresAt.Format(time.RFC3339),
		}

		bodyText := req.Message
		if bodyText == "" {
			bodyText = "面接日程のご提案です。ご都合の良い日時をお選びください。"
		}

		msg, err := ctrl.msgRepo.Create(txCtx, &messaging.Message{
			ConversationID: conv.ID,
			SenderType:     "company",
			SenderID:       companyID,
			Body:           bodyText,
			MessageType:    "interview_proposal",
			Metadata:       metadata,
		})
		if err != nil {
			return err
		}

		if err := ctrl.convRepo.UpdateLastMessageAt(txCtx, conv.ID); err != nil {
			return err
		}

		return ctrl.proposalRepo.UpdateMessageID(txCtx, proposal.ID, msg.ID)
	})
	if err != nil {
		return internalError(c, err.Error())
	}

	// Notify candidate via WebSocket about cancelled proposals
	if ctrl.ws != nil && len(cancelledProposals) > 0 {
		for _, cp := range cancelledProposals {
			payload, _ := json.Marshal(map[string]interface{}{
				"type": "proposal_cancelled",
				"payload": map[string]string{
					"proposal_id": cp.ID,
				},
			})
			ctrl.ws.Send(fmt.Sprintf("candidate:%s", candidateID), payload)
		}
	}

	// Auto-update application status to "interview" if currently applied/screening
	_, _ = ctrl.pool.Exec(ctx,
		"UPDATE job_applications SET status = 'interview', updated_at = NOW() WHERE id = $1 AND status IN ('applied', 'screening')",
		req.ApplicationID)

	slotsResp := make([]map[string]interface{}, len(createdSlots))
	for i, s := range createdSlots {
		slotsResp[i] = map[string]interface{}{
			"id":        s.ID,
			"startTime": s.StartTime,
			"endTime":   s.EndTime,
			"status":    s.Status,
		}
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"proposalId": proposal.ID,
		"slots":      slotsResp,
	})
}

type selectSlotRequest struct {
	SlotID    string `json:"slotId"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
}

func (ctrl *InterviewController) SelectSlot(c echo.Context) error {
	userID := authmw.UserID(c)

	proposalID := c.Param("proposalId")
	var req selectSlotRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request")
	}

	ctx := c.Request().Context()

	proposal, err := ctrl.proposalRepo.GetByID(ctx, proposalID)
	if err != nil {
		return notFoundError(c, "proposal not found")
	}
	if proposal.CandidateID != userID {
		return forbidden(c, "not your proposal")
	}
	if proposal.Status != "pending" {
		return badRequest(c, "proposal is not pending")
	}
	if time.Now().After(proposal.ExpiresAt) {
		return badRequest(c, "proposal has expired")
	}

	slot, err := ctrl.slotRepo.GetByID(ctx, req.SlotID)
	if err != nil {
		return notFoundError(c, "slot not found")
	}
	if slot.ProposalID != proposalID {
		return badRequest(c, "slot does not belong to this proposal")
	}

	interviewStart := slot.StartTime
	interviewEnd := slot.EndTime
	if req.StartTime != "" && req.EndTime != "" {
		st, err := time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			return badRequest(c, "invalid startTime")
		}
		et, err := time.Parse(time.RFC3339, req.EndTime)
		if err != nil {
			return badRequest(c, "invalid endTime")
		}
		if st.Before(slot.StartTime) || et.After(slot.EndTime) || !et.After(st) {
			return badRequest(c, "selected time must be within the slot range")
		}
		interviewStart = st
		interviewEnd = et
	}

	var iv *interview.Interview

	err = ctrl.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		if err := ctrl.slotRepo.UpdateStatus(txCtx, req.SlotID, "selected"); err != nil {
			return err
		}
		if err := ctrl.slotRepo.RejectOthers(txCtx, proposalID, req.SlotID); err != nil {
			return err
		}
		if err := ctrl.proposalRepo.UpdateStatus(txCtx, proposalID, "confirmed"); err != nil {
			return err
		}

		var txErr error
		iv, txErr = ctrl.interviewRepo.Create(txCtx, &interview.Interview{
			ApplicationID:  proposal.ApplicationID,
			CompanyID:      proposal.CompanyID,
			CandidateID:    userID,
			Title:          "面接",
			StartTime:      interviewStart,
			EndTime:        interviewEnd,
			Status:         "scheduled",
			SelectedSlotID: req.SlotID,
			ProposalID:     proposalID,
		})
		if txErr != nil {
			return txErr
		}

		// Send confirmation message
		conv, err := ctrl.convRepo.GetByCompanyAndCandidate(txCtx, proposal.CompanyID, userID)
		if err != nil {
			return nil
		}
		metadata := map[string]interface{}{
			"interview_id": iv.ID,
			"start_time":   slot.StartTime.Format(time.RFC3339),
			"end_time":     slot.EndTime.Format(time.RFC3339),
		}
		_, err = ctrl.msgRepo.Create(txCtx, &messaging.Message{
			ConversationID: conv.ID,
			SenderType:     "system",
			SenderID:       userID,
			Body:           "面接日程が確定しました",
			MessageType:    "interview_confirmed",
			Metadata:       metadata,
		})
		if err != nil {
			return err
		}
		return ctrl.convRepo.UpdateLastMessageAt(txCtx, conv.ID)
	})
	if err != nil {
		return internalError(c, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"interview": map[string]interface{}{
			"id":        iv.ID,
			"startTime": iv.StartTime,
			"endTime":   iv.EndTime,
			"status":    iv.Status,
		},
	})
}

func (ctrl *InterviewController) ListByCompany(c echo.Context) error {
	companyID := authmw.CompanyID(c)

	fromStr := c.QueryParam("from")
	toStr := c.QueryParam("to")
	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		from = time.Now().Truncate(24 * time.Hour)
	}
	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		to = from.Add(7 * 24 * time.Hour)
	}

	ctx := c.Request().Context()
	interviews, err := ctrl.interviewRepo.ListByCompany(ctx, companyID, from, to)
	if err != nil {
		return internalError(c, err.Error())
	}

	// Enrich with candidate names and job titles
	result := make([]map[string]interface{}, len(interviews))
	for i, iv := range interviews {
		item := map[string]interface{}{
			"id":            iv.ID,
			"applicationId": iv.ApplicationID,
			"startTime":     iv.StartTime,
			"endTime":       iv.EndTime,
			"location":      iv.Location,
			"meetingUrl":    iv.MeetingURL,
			"status":        iv.Status,
			"title":         iv.Title,
		}

		var candidateName, avatarUrl string
		_ = ctrl.pool.QueryRow(ctx, "SELECT name, COALESCE(avatar_url, '') FROM users WHERE id = $1", iv.CandidateID).
			Scan(&candidateName, &avatarUrl)
		item["candidateName"] = candidateName
		item["candidateAvatarUrl"] = avatarUrl

		var jobTitle string
		_ = ctrl.pool.QueryRow(ctx, "SELECT jp.title FROM job_applications ja JOIN job_postings jp ON jp.id = ja.job_posting_id WHERE ja.id = $1", iv.ApplicationID).
			Scan(&jobTitle)
		item["jobTitle"] = jobTitle

		result[i] = item
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"interviews": result,
	})
}

func (ctrl *InterviewController) ListByCandidate(c echo.Context) error {
	userID := authmw.UserID(c)

	ctx := c.Request().Context()
	interviews, err := ctrl.interviewRepo.ListByCandidate(ctx, userID)
	if err != nil {
		return internalError(c, err.Error())
	}

	result := make([]map[string]interface{}, len(interviews))
	for i, iv := range interviews {
		item := map[string]interface{}{
			"id":            iv.ID,
			"applicationId": iv.ApplicationID,
			"startTime":     iv.StartTime,
			"endTime":       iv.EndTime,
			"location":      iv.Location,
			"meetingUrl":    iv.MeetingURL,
			"status":        iv.Status,
			"title":         iv.Title,
		}
		var companyName string
		_ = ctrl.pool.QueryRow(ctx, "SELECT company_name FROM company_accounts WHERE id = $1", iv.CompanyID).
			Scan(&companyName)
		item["companyName"] = companyName

		var jobTitle string
		_ = ctrl.pool.QueryRow(ctx, "SELECT jp.title FROM job_applications ja JOIN job_postings jp ON jp.id = ja.job_posting_id WHERE ja.id = $1", iv.ApplicationID).
			Scan(&jobTitle)
		item["jobTitle"] = jobTitle

		result[i] = item
	}

	// Also get pending proposals
	proposals, err := ctrl.proposalRepo.ListPendingByCandidate(ctx, userID)
	if err != nil {
		proposals = nil
	}
	pendingProposals := make([]map[string]interface{}, 0, len(proposals))
	for _, p := range proposals {
		slots, err := ctrl.slotRepo.ListByProposal(ctx, p.ID)
		if err != nil {
			continue
		}
		slotData := make([]map[string]interface{}, len(slots))
		for j, s := range slots {
			slotData[j] = map[string]interface{}{
				"id":        s.ID,
				"startTime": s.StartTime,
				"endTime":   s.EndTime,
				"status":    s.Status,
			}
		}
		var companyName string
		_ = ctrl.pool.QueryRow(ctx, "SELECT company_name FROM company_accounts WHERE id = $1", p.CompanyID).
			Scan(&companyName)
		var jobTitle string
		_ = ctrl.pool.QueryRow(ctx, "SELECT jp.title FROM job_applications ja JOIN job_postings jp ON jp.id = ja.job_posting_id WHERE ja.id = $1", p.ApplicationID).
			Scan(&jobTitle)

		pendingProposals = append(pendingProposals, map[string]interface{}{
			"id":              p.ID,
			"companyName":     companyName,
			"jobTitle":        jobTitle,
			"message":         p.Message,
			"durationMinutes": p.DurationMinutes,
			"slots":           slotData,
			"expiresAt":       p.ExpiresAt,
			"createdAt":       p.CreatedAt,
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"interviews":       result,
		"pendingProposals": pendingProposals,
	})
}

func (ctrl *InterviewController) CancelInterview(c echo.Context) error {
	interviewID := c.Param("interviewId")

	companyID, _ := c.Get(authmw.CompanyIDKey).(string)
	userID, _ := c.Get(authmw.UserIDKey).(string)

	ctx := c.Request().Context()
	iv, err := ctrl.interviewRepo.GetByID(ctx, interviewID)
	if err != nil {
		return notFoundError(c, "interview not found")
	}

	if companyID != "" && iv.CompanyID != companyID {
		return forbidden(c, "forbidden")
	}
	if userID != "" && iv.CandidateID != userID {
		return forbidden(c, "forbidden")
	}
	if companyID == "" && userID == "" {
		return unauthorized(c, "unauthorized")
	}

	if iv.Status != "scheduled" {
		return badRequest(c, "interview is not scheduled")
	}

	err = ctrl.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		if err := ctrl.interviewRepo.UpdateStatus(txCtx, interviewID, "cancelled"); err != nil {
			return err
		}

		conv, err := ctrl.convRepo.GetByCompanyAndCandidate(txCtx, iv.CompanyID, iv.CandidateID)
		if err != nil {
			return nil
		}

		senderType := "company"
		senderID := companyID
		if userID != "" {
			senderType = "candidate"
			senderID = userID
		}

		metadata := map[string]interface{}{
			"interview_id": iv.ID,
			"start_time":   iv.StartTime.Format(time.RFC3339),
			"end_time":     iv.EndTime.Format(time.RFC3339),
		}

		_, err = ctrl.msgRepo.Create(txCtx, &messaging.Message{
			ConversationID: conv.ID,
			SenderType:     senderType,
			SenderID:       senderID,
			Body:           "面接がキャンセルされました",
			MessageType:    "interview_cancelled",
			Metadata:       metadata,
		})
		if err != nil {
			return err
		}
		return ctrl.convRepo.UpdateLastMessageAt(txCtx, conv.ID)
	})
	if err != nil {
		return internalError(c, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "cancelled"})
}

func (ctrl *InterviewController) GetPendingProposal(c echo.Context) error {
	// Auth is enforced by companyJwtMW; this handler does not scope by company.
	applicationID := c.Param("applicationId")
	ctx := c.Request().Context()

	var proposalID, status string
	var createdAt time.Time
	err := ctrl.pool.QueryRow(ctx,
		"SELECT id, status, created_at FROM interview_proposals WHERE application_id = $1 AND status = 'pending' AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
		applicationID).Scan(&proposalID, &status, &createdAt)
	if err != nil {
		return c.JSON(http.StatusOK, map[string]interface{}{"hasPending": false})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"hasPending": true,
		"proposalId": proposalID,
		"createdAt":  createdAt,
	})
}

func (ctrl *InterviewController) GetProposalSlots(c echo.Context) error {
	proposalID := c.Param("proposalId")
	ctx := c.Request().Context()

	proposal, err := ctrl.proposalRepo.GetByID(ctx, proposalID)
	if err != nil {
		return notFoundError(c, "proposal not found")
	}

	slots, err := ctrl.slotRepo.ListByProposal(ctx, proposalID)
	if err != nil {
		return internalError(c, err.Error())
	}

	slotData := make([]map[string]interface{}, len(slots))
	for i, s := range slots {
		slotData[i] = map[string]interface{}{
			"id":        s.ID,
			"startTime": s.StartTime,
			"endTime":   s.EndTime,
			"status":    s.Status,
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"proposal": map[string]interface{}{
			"id":        proposal.ID,
			"message":   proposal.Message,
			"status":    proposal.Status,
			"expiresAt": proposal.ExpiresAt,
		},
		"slots": slotData,
	})
}
