package careerinterest

import (
	"math"
	"sort"
)

const NumTypes = 6

var TypeIDs = [NumTypes]string{"R", "I", "A", "S", "E", "C"}

const NumBasicInterests = 20

var BasicInterestIDs = [NumBasicInterests]string{
	"A1", "A2", "A3",
	"C1", "C2", "C3",
	"E1", "E2", "E3",
	"I1", "I2", "I3", "I4",
	"R1", "R2", "R3",
	"S1", "S2", "S3", "S4",
}

var typeBasicInterests = map[string][]string{
	"R": {"R1", "R2", "R3"},
	"I": {"I1", "I2", "I3", "I4"},
	"A": {"A1", "A2", "A3"},
	"S": {"S1", "S2", "S3", "S4"},
	"E": {"E1", "E2", "E3"},
	"C": {"C1", "C2", "C3"},
}

type BasicScore struct {
	BasicInterestID string  `json:"basic_interest_id"`
	Score           float64 `json:"score"`
	Rank            int     `json:"rank"`
}

type TypeScore struct {
	TypeID string  `json:"type_id"`
	Score  float64 `json:"score"`
	Rank   int     `json:"rank"`
}

func ComputeScores(responses []Response) ([]BasicScore, []TypeScore) {
	basicSums := make(map[string]float64, NumBasicInterests)
	basicCounts := make(map[string]int, NumBasicInterests)

	for _, r := range responses {
		idx, ok := ItemIndex(r.ItemCode)
		if !ok {
			continue
		}
		bid := AllItems[idx].BasicInterestID
		basicSums[bid] += float64(r.Score)
		basicCounts[bid]++
	}

	basicScores := make([]BasicScore, 0, NumBasicInterests)
	basicScoreMap := make(map[string]float64, NumBasicInterests)
	for _, bid := range BasicInterestIDs {
		cnt := basicCounts[bid]
		var score float64
		if cnt > 0 {
			score = basicSums[bid] / float64(cnt)
		}
		score = math.Round(score*100) / 100
		basicScoreMap[bid] = score
		basicScores = append(basicScores, BasicScore{
			BasicInterestID: bid,
			Score:           score,
		})
	}

	sort.Slice(basicScores, func(i, j int) bool {
		return basicScores[i].Score > basicScores[j].Score
	})
	for i := range basicScores {
		basicScores[i].Rank = i + 1
	}

	typeScores := make([]TypeScore, 0, NumTypes)
	for _, tid := range TypeIDs {
		bids := typeBasicInterests[tid]
		sum := 0.0
		for _, bid := range bids {
			sum += basicScoreMap[bid]
		}
		score := math.Round(sum/float64(len(bids))*100) / 100
		typeScores = append(typeScores, TypeScore{
			TypeID: tid,
			Score:  score,
		})
	}

	sort.Slice(typeScores, func(i, j int) bool {
		return typeScores[i].Score > typeScores[j].Score
	})
	for i := range typeScores {
		typeScores[i].Rank = i + 1
	}

	return basicScores, typeScores
}

func ComputeDifferentiation(typeScores []TypeScore) (*float64, *string) {
	if len(typeScores) < NumTypes {
		return nil, nil
	}

	sum := 0.0
	for _, ts := range typeScores {
		sum += ts.Score
	}
	mean := sum / float64(len(typeScores))

	variance := 0.0
	for _, ts := range typeScores {
		d := ts.Score - mean
		variance += d * d
	}
	sd := math.Sqrt(variance / float64(len(typeScores)))
	sd = math.Round(sd*1000) / 1000

	var level string
	switch {
	case sd >= 1.0:
		level = "high"
	case sd >= 0.5:
		level = "moderate"
	default:
		level = "low"
	}

	return &sd, &level
}
