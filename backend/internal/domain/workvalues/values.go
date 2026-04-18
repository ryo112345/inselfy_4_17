package workvalues

import (
	"math"
	"sort"
)

const NumValues = 6

var ValueIDs = [NumValues]string{
	"achievement",
	"altruism",
	"autonomy",
	"comfort",
	"safety",
	"status",
}

var valueNeedsMap = map[string][]string{
	"achievement": {"ability_utilization", "achievement"},
	"comfort":     {"activity", "independence", "variety", "compensation", "security", "working_conditions"},
	"status":      {"advancement", "authority", "recognition", "social_status"},
	"altruism":    {"co_workers", "moral_values", "social_service"},
	"safety":      {"company_policies", "supervision_hr", "supervision_technical"},
	"autonomy":    {"autonomy", "creativity", "responsibility"},
}

type ValueScore struct {
	ValueID      string  `json:"value_id"`
	Mu           float64 `json:"mu"`
	DisplayScore float64 `json:"display_score"`
	Rank         int     `json:"rank"`
}

func AggregateValues(needsMu map[string]float64) []ValueScore {
	scores := make([]ValueScore, 0, NumValues)
	for _, vid := range ValueIDs {
		needs := valueNeedsMap[vid]
		sum := 0.0
		for _, nid := range needs {
			sum += needsMu[nid]
		}
		mu := sum / float64(len(needs))
		ds := 100.0 / (1.0 + math.Exp(-mu))
		scores = append(scores, ValueScore{
			ValueID:      vid,
			Mu:           math.Round(mu*100) / 100,
			DisplayScore: math.Round(ds*10) / 10,
		})
	}

	sort.Slice(scores, func(i, j int) bool {
		return scores[i].Mu > scores[j].Mu
	})
	for i := range scores {
		scores[i].Rank = i + 1
	}

	return scores
}
