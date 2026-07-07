package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/interview"
)

// InterviewSlotsResponse converts proposal slots to their API response.
func InterviewSlotsResponse(slots []*interview.Slot) []openapi.ModelsInterviewSlotResponse {
	result := make([]openapi.ModelsInterviewSlotResponse, len(slots))
	for i, s := range slots {
		result[i] = openapi.ModelsInterviewSlotResponse{
			Id:        s.ID,
			StartTime: s.StartTime,
			EndTime:   s.EndTime,
			Status:    s.Status,
		}
	}
	return result
}

// ProposeInterviewResponse builds the propose-interview API response.
func ProposeInterviewResponse(proposalID string, slots []*interview.Slot) *openapi.ModelsProposeInterviewResponse {
	return &openapi.ModelsProposeInterviewResponse{
		ProposalId: proposalID,
		Slots:      InterviewSlotsResponse(slots),
	}
}

// SelectSlotResponse builds the slot-selection API response.
func SelectSlotResponse(iv *interview.Interview) *openapi.ModelsSelectSlotResponse {
	return &openapi.ModelsSelectSlotResponse{
		Interview: openapi.ModelsSelectedInterview{
			Id:        iv.ID,
			StartTime: iv.StartTime,
			EndTime:   iv.EndTime,
			Status:    iv.Status,
		},
	}
}

// CompanyInterviewsResponse builds the company interview-list API response.
func CompanyInterviewsResponse(interviews []*interview.InterviewWithNames) *openapi.ModelsCompanyInterviewListResponse {
	result := make([]openapi.ModelsCompanyInterviewItem, len(interviews))
	for i, iv := range interviews {
		result[i] = openapi.ModelsCompanyInterviewItem{
			Id:                 iv.ID,
			ApplicationId:      iv.ApplicationID,
			StartTime:          iv.StartTime,
			EndTime:            iv.EndTime,
			Location:           iv.Location,
			MeetingUrl:         iv.MeetingURL,
			Status:             iv.Status,
			Title:              iv.Title,
			CandidateName:      iv.CandidateName,
			CandidateAvatarUrl: iv.CandidateAvatar,
			JobTitle:           iv.JobTitle,
		}
	}
	return &openapi.ModelsCompanyInterviewListResponse{Items: result}
}

// CandidateInterviewsResponse builds the candidate interview-list API response.
func CandidateInterviewsResponse(interviews []*interview.InterviewWithNames, proposals []*interview.ProposalWithDetails) *openapi.ModelsCandidateInterviewListResponse {
	result := make([]openapi.ModelsCandidateInterviewItem, len(interviews))
	for i, iv := range interviews {
		result[i] = openapi.ModelsCandidateInterviewItem{
			Id:            iv.ID,
			ApplicationId: iv.ApplicationID,
			StartTime:     iv.StartTime,
			EndTime:       iv.EndTime,
			Location:      iv.Location,
			MeetingUrl:    iv.MeetingURL,
			Status:        iv.Status,
			Title:         iv.Title,
			CompanyName:   iv.CompanyName,
			JobTitle:      iv.JobTitle,
		}
	}

	pendingProposals := make([]openapi.ModelsPendingProposalItem, 0, len(proposals))
	for _, p := range proposals {
		pendingProposals = append(pendingProposals, openapi.ModelsPendingProposalItem{
			Id:              p.ID,
			CompanyName:     p.CompanyName,
			JobTitle:        p.JobTitle,
			Message:         p.Message,
			DurationMinutes: p.DurationMinutes,
			Slots:           InterviewSlotsResponse(p.Slots),
			ExpiresAt:       p.ExpiresAt,
			CreatedAt:       p.CreatedAt,
		})
	}

	return &openapi.ModelsCandidateInterviewListResponse{
		Interviews:       result,
		PendingProposals: pendingProposals,
	}
}

// ProposalSlotsResponse builds the proposal-slots API response.
func ProposalSlotsResponse(proposal *interview.Proposal, slots []*interview.Slot) *openapi.ModelsProposalSlotsResponse {
	return &openapi.ModelsProposalSlotsResponse{
		Proposal: openapi.ModelsProposalSummary{
			Id:        proposal.ID,
			Message:   proposal.Message,
			Status:    proposal.Status,
			ExpiresAt: proposal.ExpiresAt,
		},
		Slots: InterviewSlotsResponse(slots),
	}
}
