package workvalues

import "math"

// CosineSimilarity compares two mu vectors over the 21 needs and maps the
// result from [-1, 1] to [0, 1].
func CosineSimilarity(a, b map[string]float64) float64 {
	var dot, normA, normB float64
	for _, need := range NeedIDs {
		va := a[need]
		vb := b[need]
		dot += va * vb
		normA += va * va
		normB += vb * vb
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return (dot/(math.Sqrt(normA)*math.Sqrt(normB)) + 1) / 2
}
