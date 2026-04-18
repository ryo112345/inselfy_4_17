package careerinterest

import (
	"fmt"
	"math/rand/v2"

	domainerrors "github.com/akiyama/inselfy/backend/internal/domain/errors"
)

const FixedQuestions = 60

func GenerateItems(rng *rand.Rand) []Item {
	indices := make([]int, TotalItems)
	for i := range indices {
		indices[i] = i
	}
	rng.Shuffle(TotalItems, func(i, j int) {
		indices[i], indices[j] = indices[j], indices[i]
	})

	items := make([]Item, TotalItems)
	for i, idx := range indices {
		def := AllItems[idx]
		items[i] = Item{
			QuestionNumber:  i + 1,
			ItemCode:        def.ItemCode,
			BasicInterestID: def.BasicInterestID,
			SkillLevel:      def.SkillLevel,
			ActivityType:    def.ActivityType,
			TextJa:          def.TextJa,
		}
	}
	return items
}

type SubmitInput struct {
	Responses []Response
}

func ValidateAndCompute(session *Session, input SubmitInput) (*Result, error) {
	if session.Status != StatusInProgress {
		return nil, domainerrors.NewValidation("session is not in progress")
	}

	if len(input.Responses) != FixedQuestions {
		return nil, domainerrors.NewValidation(
			fmt.Sprintf("question count must be %d, got %d", FixedQuestions, len(input.Responses)),
		)
	}

	if err := validateResponses(session.Items, input.Responses); err != nil {
		return nil, err
	}

	basicScores, typeScores := ComputeScores(input.Responses)
	sd, level := ComputeDifferentiation(typeScores)

	return &Result{
		SessionID:            session.ID,
		UserID:               session.UserID,
		Responses:            input.Responses,
		QuestionCount:        len(input.Responses),
		DifferentiationSD:    sd,
		DifferentiationLevel: level,
		BasicScores:          basicScores,
		TypeScores:           typeScores,
	}, nil
}

func validateResponses(items []Item, responses []Response) error {
	itemCodeSet := make(map[string]bool, len(items))
	for _, item := range items {
		itemCodeSet[item.ItemCode] = true
	}

	seen := make(map[string]bool)
	for i, r := range responses {
		if r.QuestionNumber != i+1 {
			return domainerrors.NewValidation(
				fmt.Sprintf("response[%d]: question_number must be %d, got %d", i, i+1, r.QuestionNumber),
			)
		}
		if _, ok := ItemIndex(r.ItemCode); !ok {
			return domainerrors.NewValidation(
				fmt.Sprintf("response[%d]: invalid item_code %q", i, r.ItemCode),
			)
		}
		if !itemCodeSet[r.ItemCode] {
			return domainerrors.NewValidation(
				fmt.Sprintf("response[%d]: item_code %q not in session items", i, r.ItemCode),
			)
		}
		if r.Score < 1 || r.Score > 5 {
			return domainerrors.NewValidation(
				fmt.Sprintf("response[%d]: score must be 1-5, got %d", i, r.Score),
			)
		}
		if seen[r.ItemCode] {
			return domainerrors.NewValidation(
				fmt.Sprintf("response[%d]: duplicate item_code %q", i, r.ItemCode),
			)
		}
		seen[r.ItemCode] = true
	}
	return nil
}
