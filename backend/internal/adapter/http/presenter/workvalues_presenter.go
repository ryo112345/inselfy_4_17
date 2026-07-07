package presenter

import (
	"math"
	"sort"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

// WorkValuesSessionResponse converts a session entity to its API response.
func WorkValuesSessionResponse(s *workvalues.Session) any {
	pairs := make([]openapi.ModelsWVPairResponse, len(s.InitialPairs))
	for i, pair := range s.InitialPairs {
		pairs[i] = openapi.ModelsWVPairResponse{NeedA: pair.NeedA, NeedB: pair.NeedB}
	}
	needs := make([]openapi.ModelsWVNeedDefResponse, workvalues.N)
	for i, d := range workvalues.NeedDefs {
		needs[i] = openapi.ModelsWVNeedDefResponse{Id: d.ID, Label: d.Label, DescriptionJa: d.DescriptionJa}
	}
	return &openapi.ModelsWVSessionResponse{
		Id:           s.ID,
		Status:       openapi.ModelsDiagnosisSessionStatus(s.Status),
		InitialPairs: pairs,
		Needs:        needs,
	}
}

// WorkValuesResultResponse converts a result entity to its API response.
func WorkValuesResultResponse(r *workvalues.Result) any {
	needs := make([]openapi.ModelsWVNeedScore, 0, len(r.Mu))
	for key, mu := range r.Mu {
		ds := 100.0 / (1.0 + math.Exp(-mu))
		ns := openapi.ModelsWVNeedScore{
			NeedId:       key,
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
		needs[i].Rank = int32(i + 1)
	}

	values := make([]openapi.ModelsWVValueScoreResponse, len(r.Values))
	for i, v := range r.Values {
		values[i] = openapi.ModelsWVValueScoreResponse{
			ValueId:      v.ValueID,
			DisplayScore: math.Round(v.DisplayScore*10) / 10,
			Rank:         int32(v.Rank),
		}
	}

	return &openapi.ModelsWVResultResponse{
		Id:        r.ID,
		SessionId: r.SessionID,
		UserId:    r.UserID,
		Needs:     needs,
		Values:    values,
		CreatedAt: r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
