package workvalues

import "sort"

// TopNeedIDs returns the ids of the n highest-mu needs.
func TopNeedIDs(mu map[string]float64, n int) []string {
	type needScore struct {
		id string
		mu float64
	}
	scores := make([]needScore, 0, len(mu))
	for id, v := range mu {
		scores = append(scores, needScore{id, v})
	}
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].mu > scores[j].mu
	})
	if len(scores) > n {
		scores = scores[:n]
	}
	ids := make([]string, len(scores))
	for i, s := range scores {
		ids[i] = s.id
	}
	return ids
}

// NeedLabels maps need ids to their Japanese labels, skipping unknown ids.
func NeedLabels(ids []string) []string {
	labels := make([]string, 0, len(ids))
	for _, id := range ids {
		def, ok := NeedDefByID(id)
		if ok {
			labels = append(labels, def.Label)
		}
	}
	return labels
}
