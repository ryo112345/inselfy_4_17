package presenter

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WorkValuesPresenter struct {
	session *SessionResponse
	result  *ResultResponse
}

var _ port.WorkValuesOutputPort = (*WorkValuesPresenter)(nil)

func NewWorkValuesPresenter() *WorkValuesPresenter {
	return &WorkValuesPresenter{}
}

func (p *WorkValuesPresenter) PresentSession(_ context.Context, s *workvalues.Session) error {
	pairs := make([]PairResponse, len(s.InitialPairs))
	for i, pair := range s.InitialPairs {
		pairs[i] = PairResponse{NeedA: pair.NeedA, NeedB: pair.NeedB}
	}
	p.session = &SessionResponse{
		ID:           s.ID,
		Status:       s.Status,
		InitialPairs: pairs,
	}
	return nil
}

func (p *WorkValuesPresenter) PresentResult(_ context.Context, r *workvalues.Result) error {
	needs := make([]NeedScore, 0, len(r.Mu))
	for key, mu := range r.Mu {
		needs = append(needs, NeedScore{
			NeedID: key,
			Mu:     mu,
			SE:     r.SE[key],
		})
	}
	p.result = &ResultResponse{
		ID:                     r.ID,
		SessionID:              r.SessionID,
		Needs:                  needs,
		ConsistencyCoefficient: r.ConsistencyCoefficient,
		ConsistencyLevel:       r.ConsistencyLevel,
		QuestionCount:          r.QuestionCount,
	}
	return nil
}

func (p *WorkValuesPresenter) Session() *SessionResponse { return p.session }
func (p *WorkValuesPresenter) Result() *ResultResponse    { return p.result }

type SessionResponse struct {
	ID           string         `json:"id"`
	Status       string         `json:"status"`
	InitialPairs []PairResponse `json:"initial_pairs"`
}

type PairResponse struct {
	NeedA string `json:"need_a"`
	NeedB string `json:"need_b"`
}

type ResultResponse struct {
	ID                     string     `json:"id"`
	SessionID              string     `json:"session_id"`
	Needs                  []NeedScore `json:"needs"`
	ConsistencyCoefficient *float64   `json:"consistency_coefficient"`
	ConsistencyLevel       *string    `json:"consistency_level"`
	QuestionCount          int        `json:"question_count"`
}

type NeedScore struct {
	NeedID string  `json:"need_id"`
	Mu     float64 `json:"mu"`
	SE     float64 `json:"se"`
}
