package presenter

import (
	"context"
	"math"
	"sort"

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
	needs := make([]NeedDefResponse, workvalues.N)
	for i, d := range workvalues.NeedDefs {
		needs[i] = NeedDefResponse{ID: d.ID, Label: d.Label, DescriptionJa: d.DescriptionJa}
	}
	p.session = &SessionResponse{
		ID:           s.ID,
		Status:       s.Status,
		InitialPairs: pairs,
		Needs:        needs,
	}
	return nil
}

func (p *WorkValuesPresenter) PresentResult(_ context.Context, r *workvalues.Result) error {
	needs := make([]NeedScore, 0, len(r.Mu))
	for key, mu := range r.Mu {
		ds := 100.0 / (1.0 + math.Exp(-mu))
		ns := NeedScore{
			NeedID:       key,
			DisplayScore: math.Round(ds*10) / 10,
		}
		if def, ok := workvalues.NeedDefByID(key); ok {
			ns.Label = def.Label
			ns.DescriptionJa = def.DescriptionJa
		}
		needs = append(needs, ns)
	}
	sort.Slice(needs, func(i, j int) bool {
		return needs[i].DisplayScore > needs[j].DisplayScore
	})
	for i := range needs {
		needs[i].Rank = i + 1
	}

	values := make([]ValueScoreResponse, len(r.Values))
	for i, v := range r.Values {
		values[i] = ValueScoreResponse{
			ValueID:      v.ValueID,
			DisplayScore: math.Round(v.DisplayScore*10) / 10,
			Rank:         v.Rank,
		}
	}

	p.result = &ResultResponse{
		ID:        r.ID,
		SessionID: r.SessionID,
		Needs:     needs,
		Values:    values,
	}
	return nil
}

func (p *WorkValuesPresenter) Session() *SessionResponse { return p.session }
func (p *WorkValuesPresenter) Result() *ResultResponse    { return p.result }

type SessionResponse struct {
	ID           string            `json:"id"`
	Status       string            `json:"status"`
	InitialPairs []PairResponse    `json:"initial_pairs"`
	Needs        []NeedDefResponse `json:"needs"`
}

type NeedDefResponse struct {
	ID            string `json:"id"`
	Label         string `json:"label"`
	DescriptionJa string `json:"description_ja"`
}

type PairResponse struct {
	NeedA string `json:"need_a"`
	NeedB string `json:"need_b"`
}

type ResultResponse struct {
	ID        string               `json:"id"`
	SessionID string               `json:"session_id"`
	Needs     []NeedScore          `json:"needs"`
	Values    []ValueScoreResponse `json:"values"`
}

type NeedScore struct {
	NeedID        string  `json:"need_id"`
	Label         string  `json:"label"`
	DescriptionJa string  `json:"description_ja"`
	DisplayScore  float64 `json:"display_score"`
	Rank          int     `json:"rank"`
}

type ValueScoreResponse struct {
	ValueID      string  `json:"value_id"`
	DisplayScore float64 `json:"display_score"`
	Rank         int     `json:"rank"`
}
