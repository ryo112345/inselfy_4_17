package presenter

import (
	"math"
	"sort"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

// WorkValuesSessionResponse converts a session entity to its API response.
func WorkValuesSessionResponse(s *workvalues.Session) any {
	pairs := make([]PairResponse, len(s.InitialPairs))
	for i, pair := range s.InitialPairs {
		pairs[i] = PairResponse{NeedA: pair.NeedA, NeedB: pair.NeedB}
	}
	needs := make([]NeedDefResponse, workvalues.N)
	for i, d := range workvalues.NeedDefs {
		needs[i] = NeedDefResponse{ID: d.ID, Label: d.Label, DescriptionJa: d.DescriptionJa}
	}
	return &SessionResponse{
		ID:           s.ID,
		Status:       s.Status,
		InitialPairs: pairs,
		Needs:        needs,
	}
}

// WorkValuesResultResponse converts a result entity to its API response.
func WorkValuesResultResponse(r *workvalues.Result) any {
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

	return &ResultResponse{
		ID:        r.ID,
		SessionID: r.SessionID,
		UserID:    r.UserID,
		Needs:     needs,
		Values:    values,
		CreatedAt: r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

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
	UserID    string               `json:"user_id"`
	Needs     []NeedScore          `json:"needs"`
	Values    []ValueScoreResponse `json:"values"`
	CreatedAt string               `json:"created_at"`
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
