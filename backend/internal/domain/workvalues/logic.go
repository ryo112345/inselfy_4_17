package workvalues

import (
	"fmt"
	"math"
	"math/rand/v2"

	domainerrors "github.com/akiyama/inselfy/backend/internal/domain/errors"
)

const (
	FixedQuestions = 70
	MuTolerance   = 1e-3
)

func GenerateInitialPairs(rng *rand.Rand) []Pair {
	indices := make([]int, N)
	for i := range indices {
		indices[i] = i
	}
	rng.Shuffle(N, func(i, j int) {
		indices[i], indices[j] = indices[j], indices[i]
	})

	pairs := make([]Pair, N)
	for i := 0; i < N; i++ {
		a := indices[i]
		b := indices[(i+1)%N]
		pairs[i] = Pair{NeedA: NeedIDs[a], NeedB: NeedIDs[b]}
	}

	rng.Shuffle(len(pairs), func(i, j int) {
		pairs[i], pairs[j] = pairs[j], pairs[i]
	})

	return pairs
}

type SubmitInput struct {
	Responses []Response
	Mu        map[string]float64
	SE        map[string]float64
}

func ValidateAndVerify(session *Session, input SubmitInput) (*Result, error) {
	if session.Status != StatusInProgress {
		return nil, domainerrors.NewValidation("session is not in progress")
	}

	qCount := len(input.Responses)
	if qCount != FixedQuestions {
		return nil, domainerrors.NewValidation(
			fmt.Sprintf("question count must be %d, got %d", FixedQuestions, qCount),
		)
	}

	if err := validateResponses(input.Responses); err != nil {
		return nil, err
	}

	if err := validateInitialPairsPresent(session.InitialPairs, input.Responses); err != nil {
		return nil, err
	}

	wins := buildWinMatrix(input.Responses)
	serverBT := EstimateBT(wins)

	if err := verifyMu(input.Mu, serverBT.Mu); err != nil {
		return nil, err
	}

	cc, cl := computeConsistency(wins, input.Responses)

	return &Result{
		SessionID:              session.ID,
		UserID:                 session.UserID,
		Responses:              input.Responses,
		Mu:                     needArrayToMap(serverBT.Mu),
		SE:                     needArrayToMap(serverBT.SE),
		ConsistencyCoefficient: cc,
		ConsistencyLevel:       cl,
		QuestionCount:          qCount,
	}, nil
}

func validateResponses(responses []Response) error {
	seen := make(map[string]bool)
	for i, r := range responses {
		if r.QuestionNumber != i+1 {
			return domainerrors.NewValidation(fmt.Sprintf("response[%d]: question_number must be %d, got %d", i, i+1, r.QuestionNumber))
		}
		if _, ok := NeedIndex(r.NeedA); !ok {
			return domainerrors.NewValidation(fmt.Sprintf("response[%d]: invalid need_a %q", i, r.NeedA))
		}
		if _, ok := NeedIndex(r.NeedB); !ok {
			return domainerrors.NewValidation(fmt.Sprintf("response[%d]: invalid need_b %q", i, r.NeedB))
		}
		if r.Winner != r.NeedA && r.Winner != r.NeedB {
			return domainerrors.NewValidation(fmt.Sprintf("response[%d]: winner must be need_a or need_b", i))
		}
		key := pairKey(r.NeedA, r.NeedB)
		if seen[key] {
			return domainerrors.NewValidation(fmt.Sprintf("response[%d]: duplicate pair %s vs %s", i, r.NeedA, r.NeedB))
		}
		seen[key] = true
	}
	return nil
}

func validateInitialPairsPresent(initialPairs []Pair, responses []Response) error {
	if len(responses) < len(initialPairs) {
		return domainerrors.NewValidation(fmt.Sprintf("responses must have at least %d entries for initial pairs", len(initialPairs)))
	}
	for i, p := range initialPairs {
		r := responses[i]
		if pairKey(r.NeedA, r.NeedB) != pairKey(p.NeedA, p.NeedB) {
			return domainerrors.NewValidation(fmt.Sprintf("response[%d] must be initial pair (%s vs %s), got (%s vs %s)", i, p.NeedA, p.NeedB, r.NeedA, r.NeedB))
		}
	}
	return nil
}

func buildWinMatrix(responses []Response) [N][N]int {
	var wins [N][N]int
	for _, r := range responses {
		wi, _ := NeedIndex(r.Winner)
		loser := r.NeedA
		if r.Winner == r.NeedA {
			loser = r.NeedB
		}
		li, _ := NeedIndex(loser)
		wins[wi][li] = 1
	}
	return wins
}

func verifyMu(clientMu map[string]float64, serverMu []float64) error {
	if len(clientMu) != N {
		return domainerrors.NewValidation(fmt.Sprintf("mu must have %d entries", N))
	}
	for i, id := range NeedIDs {
		cv, ok := clientMu[id]
		if !ok {
			return domainerrors.NewValidation(fmt.Sprintf("mu missing key %q", id))
		}
		if math.Abs(cv-serverMu[i]) > MuTolerance {
			return domainerrors.NewValidation("mu verification failed: client and server estimates do not match")
		}
	}
	return nil
}

func computeConsistency(wins [N][N]int, responses []Response) (*float64, *string) {
	asked := make(map[string]bool)
	for _, r := range responses {
		asked[pairKey(r.NeedA, r.NeedB)] = true
	}

	totalTriads := 0
	circularTriads := 0

	for i := 0; i < N; i++ {
		for j := i + 1; j < N; j++ {
			for k := j + 1; k < N; k++ {
				ij := pairKey(NeedIDs[i], NeedIDs[j])
				jk := pairKey(NeedIDs[j], NeedIDs[k])
				ik := pairKey(NeedIDs[i], NeedIDs[k])
				if !asked[ij] || !asked[jk] || !asked[ik] {
					continue
				}
				totalTriads++

				// Check for circular triad: each item wins exactly once
				winsCount := [3]int{}
				indices := [3]int{i, j, k}
				for a := 0; a < 3; a++ {
					for b := 0; b < 3; b++ {
						if a == b {
							continue
						}
						if wins[indices[a]][indices[b]] > 0 {
							winsCount[a]++
						}
					}
				}
				if winsCount[0] == 1 && winsCount[1] == 1 && winsCount[2] == 1 {
					circularTriads++
				}
			}
		}
	}

	if totalTriads < 30 {
		level := "insufficient_data"
		return nil, &level
	}

	maxCircular := totalTriads / 4
	if maxCircular == 0 {
		maxCircular = 1
	}
	coeff := 1.0 - float64(circularTriads)/float64(maxCircular)
	if coeff < 0 {
		coeff = 0
	}

	var level string
	switch {
	case coeff >= 0.75:
		level = "high"
	case coeff >= 0.50:
		level = "moderate"
	case coeff >= 0.30:
		level = "low"
	default:
		level = "very_low"
	}

	return &coeff, &level
}

func needArrayToMap(arr []float64) map[string]float64 {
	m := make(map[string]float64, N)
	for i, id := range NeedIDs {
		m[id] = arr[i]
	}
	return m
}

func pairKey(a, b string) string {
	if a < b {
		return a + "|" + b
	}
	return b + "|" + a
}
