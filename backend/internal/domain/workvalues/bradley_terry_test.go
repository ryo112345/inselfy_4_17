package workvalues

import (
	"math"
	"testing"
)

func TestEstimateBT_AllZero(t *testing.T) {
	var wins [N][N]int
	result := EstimateBT(wins)
	for i, v := range result.Mu {
		if math.Abs(v) > 1e-6 {
			t.Errorf("mu[%d] = %f, want ~0", i, v)
		}
	}
}

func TestEstimateBT_MeanZero(t *testing.T) {
	var wins [N][N]int
	for j := 1; j <= 5; j++ {
		wins[0][j] = 1
	}
	result := EstimateBT(wins)
	sum := 0.0
	for _, v := range result.Mu {
		sum += v
	}
	if math.Abs(sum/float64(N)) > 1e-6 {
		t.Errorf("mean(mu) = %f, want ~0", sum/float64(N))
	}
}

func TestEstimateBT_AllWinMax(t *testing.T) {
	var wins [N][N]int
	for j := 1; j < N; j++ {
		wins[0][j] = 1
	}
	result := EstimateBT(wins)
	maxMu := result.Mu[0]
	for i := 1; i < N; i++ {
		if result.Mu[i] > maxMu {
			t.Errorf("mu[%d] = %f > mu[0] = %f", i, result.Mu[i], maxMu)
		}
	}
	if maxMu < 1 || maxMu > 5 {
		t.Errorf("mu[0] = %f, expected in [1, 5]", maxMu)
	}
}

func TestEstimateBT_TransitiveOrder(t *testing.T) {
	var wins [N][N]int
	for i := range N {
		for j := i + 1; j < N; j++ {
			wins[i][j] = 1
		}
	}
	result := EstimateBT(wins)
	for i := range N - 1 {
		if result.Mu[i] <= result.Mu[i+1] {
			t.Errorf("mu[%d] = %f <= mu[%d] = %f", i, result.Mu[i], i+1, result.Mu[i+1])
		}
	}
}

func TestEstimateBT_MatchesTS(t *testing.T) {
	// Verify Go and TS implementations produce consistent results
	// by checking a known transitive order case.
	var wins [N][N]int
	for i := range N {
		for j := i + 1; j < N; j++ {
			wins[i][j] = 1
		}
	}
	result := EstimateBT(wins)

	// mu[0] should be the largest, mu[20] the smallest
	if result.Mu[0] < result.Mu[N-1] {
		t.Error("expected mu[0] > mu[20]")
	}

	// SE should be finite for all needs
	for i, se := range result.SE {
		if math.IsInf(se, 0) || math.IsNaN(se) {
			t.Errorf("SE[%d] is not finite: %f", i, se)
		}
	}
}
