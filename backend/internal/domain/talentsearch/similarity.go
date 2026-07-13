package talentsearch

import "math"

// WVValueIDs are the aggregated work-values dimensions used for matching.
var WVValueIDs = []string{"achievement", "comfort", "status", "altruism", "safety", "autonomy"}

// CITypeIDs are the RIASEC type ids in canonical order.
var CITypeIDs = [6]string{"R", "I", "A", "S", "E", "C"}

// CITypeIndex maps a RIASEC type id to its slot in a [6]float64 vector.
var CITypeIndex = map[string]int{"R": 0, "I": 1, "A": 2, "S": 3, "E": 4, "C": 5}

const (
	sigmaWV      = 18.0
	sigmaCI      = 0.7
	geomeanFloor = 0.001
)

func gauss(diff, sigma float64) float64 {
	return math.Exp(-(diff * diff) / (2 * sigma * sigma))
}

// GaussianWVSimilarity scores how close a user's work-values display scores
// are to a target profile as a 0-100 value with one decimal. Per-dimension
// Gaussian closeness is combined as a geometric mean weighted by the user's
// own score, so dimensions the user cares about dominate. Dimensions missing
// on either side are skipped; no overlap yields 0.
func GaussianWVSimilarity(userScores, targetScores map[string]float64) float64 {
	var logSum, weightTotal float64
	for _, vid := range WVValueIDs {
		u, uOk := userScores[vid]
		t, tOk := targetScores[vid]
		if !uOk || !tOk {
			continue
		}
		closeness := gauss(math.Abs(u-t), sigmaWV)
		logSum += u * math.Log(closeness+geomeanFloor)
		weightTotal += u
	}
	if weightTotal == 0 {
		return 0
	}
	return math.Round(math.Exp(logSum/weightTotal)*1000) / 10
}

// GaussianCISimilarity scores how close a user's RIASEC vector is to a target
// vector as a 0-100 value with one decimal, using an unweighted geometric
// mean. Dimensions where both sides are 0 are skipped; all-zero yields 0.
func GaussianCISimilarity(userScores, targetScores [6]float64) float64 {
	var logSum float64
	count := 0
	for i := range 6 {
		if userScores[i] == 0 && targetScores[i] == 0 {
			continue
		}
		logSum += math.Log(gauss(math.Abs(userScores[i]-targetScores[i]), sigmaCI) + geomeanFloor)
		count++
	}
	if count == 0 {
		return 0
	}
	return math.Round(math.Exp(logSum/float64(count))*1000) / 10
}
