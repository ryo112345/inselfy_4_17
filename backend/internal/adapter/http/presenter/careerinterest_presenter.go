package presenter

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestPresenter struct {
	session *CISessionResponse
	result  *CIResultResponse
}

var _ port.CareerInterestOutputPort = (*CareerInterestPresenter)(nil)

func NewCareerInterestPresenter() *CareerInterestPresenter {
	return &CareerInterestPresenter{}
}

func (p *CareerInterestPresenter) PresentSession(_ context.Context, s *careerinterest.Session) error {
	items := make([]CIItemResponse, len(s.Items))
	for i, item := range s.Items {
		items[i] = CIItemResponse{
			QuestionNumber:  item.QuestionNumber,
			ItemCode:        item.ItemCode,
			BasicInterestID: item.BasicInterestID,
			SkillLevel:      item.SkillLevel,
			ActivityType:    item.ActivityType,
			TextJa:          item.TextJa,
		}
	}
	p.session = &CISessionResponse{
		ID:     s.ID,
		Status: s.Status,
		Items:  items,
	}
	return nil
}

func (p *CareerInterestPresenter) PresentResult(_ context.Context, r *careerinterest.Result) error {
	basicScores := make([]CIBasicScoreResponse, len(r.BasicScores))
	for i, s := range r.BasicScores {
		basicScores[i] = CIBasicScoreResponse{
			BasicInterestID: s.BasicInterestID,
			Score:           s.Score,
			Rank:            s.Rank,
		}
	}

	typeScores := make([]CITypeScoreResponse, len(r.TypeScores))
	for i, s := range r.TypeScores {
		typeScores[i] = CITypeScoreResponse{
			TypeID: s.TypeID,
			Score:  s.Score,
			Rank:   s.Rank,
		}
	}

	p.result = &CIResultResponse{
		ID:          r.ID,
		SessionID:   r.SessionID,
		UserID:      r.UserID,
		BasicScores: basicScores,
		TypeScores:  typeScores,
		CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	return nil
}

func (p *CareerInterestPresenter) Session() *CISessionResponse { return p.session }
func (p *CareerInterestPresenter) Result() *CIResultResponse   { return p.result }

type CISessionResponse struct {
	ID     string           `json:"id"`
	Status string           `json:"status"`
	Items  []CIItemResponse `json:"items"`
}

type CIItemResponse struct {
	QuestionNumber  int    `json:"question_number"`
	ItemCode        string `json:"item_code"`
	BasicInterestID string `json:"basic_interest_id"`
	SkillLevel      string `json:"skill_level"`
	ActivityType    string `json:"activity_type"`
	TextJa          string `json:"text_ja"`
}

type CIResultResponse struct {
	ID          string                 `json:"id"`
	SessionID   string                 `json:"session_id"`
	UserID      string                 `json:"user_id"`
	BasicScores []CIBasicScoreResponse `json:"basic_scores"`
	TypeScores  []CITypeScoreResponse  `json:"type_scores"`
	CreatedAt   string                 `json:"created_at"`
}

type CIBasicScoreResponse struct {
	BasicInterestID string  `json:"basic_interest_id"`
	Score           float64 `json:"score"`
	Rank            int     `json:"rank"`
}

type CITypeScoreResponse struct {
	TypeID string  `json:"type_id"`
	Score  float64 `json:"score"`
	Rank   int     `json:"rank"`
}
