package workvalues

import (
	"math/rand/v2"
	"testing"
)

func TestGenerateInitialPairs(t *testing.T) {
	rng := rand.New(rand.NewPCG(42, 0)) //nolint:gosec // G404: テスト用の固定シード
	pairs := GenerateInitialPairs(rng)

	if len(pairs) != N {
		t.Fatalf("expected %d pairs, got %d", N, len(pairs))
	}

	counts := make(map[string]int)
	for _, p := range pairs {
		counts[p.NeedA]++
		counts[p.NeedB]++
	}

	for _, id := range NeedIDs {
		if counts[id] != 2 {
			t.Errorf("need %s appears %d times, want 2", id, counts[id])
		}
	}
}

func TestValidateResponses_InvalidNeed(t *testing.T) {
	responses := []Response{
		{NeedA: "invalid", NeedB: "creativity", Winner: "creativity", QuestionNumber: 1},
	}
	err := validateResponses(responses)
	if err == nil {
		t.Error("expected validation error for invalid need")
	}
}

func TestValidateResponses_InvalidWinner(t *testing.T) {
	responses := []Response{
		{NeedA: "creativity", NeedB: "security", Winner: "autonomy", QuestionNumber: 1},
	}
	err := validateResponses(responses)
	if err == nil {
		t.Error("expected validation error for invalid winner")
	}
}

func TestValidateResponses_DuplicatePair(t *testing.T) {
	responses := []Response{
		{NeedA: "creativity", NeedB: "security", Winner: "creativity", QuestionNumber: 1},
		{NeedA: "security", NeedB: "creativity", Winner: "security", QuestionNumber: 2},
	}
	err := validateResponses(responses)
	if err == nil {
		t.Error("expected validation error for duplicate pair")
	}
}

func TestValidateResponses_BadQuestionNumber(t *testing.T) {
	responses := []Response{
		{NeedA: "creativity", NeedB: "security", Winner: "creativity", QuestionNumber: 5},
	}
	err := validateResponses(responses)
	if err == nil {
		t.Error("expected validation error for wrong question_number")
	}
}

func TestValidateInitialPairsPresent(t *testing.T) {
	initial := []Pair{
		{NeedA: "creativity", NeedB: "security"},
	}
	responses := []Response{
		{NeedA: "autonomy", NeedB: "compensation", Winner: "autonomy", QuestionNumber: 1},
	}
	err := validateInitialPairsPresent(initial, responses)
	if err == nil {
		t.Error("expected error when initial pair is not at correct position")
	}
}

func TestValidateInitialPairsPresent_CorrectPosition(t *testing.T) {
	initial := []Pair{
		{NeedA: "creativity", NeedB: "security"},
	}
	responses := []Response{
		{NeedA: "creativity", NeedB: "security", Winner: "creativity", QuestionNumber: 1},
		{NeedA: "autonomy", NeedB: "compensation", Winner: "autonomy", QuestionNumber: 2},
	}
	err := validateInitialPairsPresent(initial, responses)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestBuildWinMatrix(t *testing.T) {
	responses := []Response{
		{NeedA: "creativity", NeedB: "security", Winner: "creativity", QuestionNumber: 1},
		{NeedA: "autonomy", NeedB: "creativity", Winner: "autonomy", QuestionNumber: 2},
	}
	wins := buildWinMatrix(responses)

	ci, _ := NeedIndex("creativity")
	si, _ := NeedIndex("security")
	ai, _ := NeedIndex("autonomy")

	if wins[ci][si] != 1 {
		t.Error("expected creativity > security")
	}
	if wins[ai][ci] != 1 {
		t.Error("expected autonomy > creativity")
	}
}
