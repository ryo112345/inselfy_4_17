package talentsearch_test

import (
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
)

// Expected values are computed independently from the formula:
// closeness = exp(-diff²/(2σ²)), score = round(geomean(closeness+0.001)×1000)/10
// with σ=18 (WV, weighted by user scores) and σ=0.7 (CI, unweighted).

func TestGaussianWVSimilarity(t *testing.T) {
	for _, tc := range []struct {
		name   string
		user   map[string]float64
		target map[string]float64
		want   float64
	}{
		{
			"identical scores cap at 100.1 (floor artifact)",
			map[string]float64{"achievement": 80, "autonomy": 60},
			map[string]float64{"achievement": 80, "autonomy": 60},
			100.1,
		},
		{
			"one sigma apart",
			map[string]float64{"achievement": 80},
			map[string]float64{"achievement": 62},
			60.8,
		},
		{
			"weighted by user scores",
			map[string]float64{"achievement": 50, "comfort": 70},
			map[string]float64{"achievement": 80, "comfort": 40},
			25.0,
		},
		{
			"no overlapping dimensions",
			map[string]float64{"achievement": 80},
			map[string]float64{"comfort": 50},
			0,
		},
		{
			"all-zero user weights",
			map[string]float64{"achievement": 0},
			map[string]float64{"achievement": 50},
			0,
		},
		{
			"unknown dimensions are ignored",
			map[string]float64{"achievement": 80, "bogus": 10},
			map[string]float64{"achievement": 80, "bogus": 90},
			100.1,
		},
	} {
		if got := talentsearch.GaussianWVSimilarity(tc.user, tc.target); got != tc.want {
			t.Errorf("%s: got %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestGaussianCISimilarity(t *testing.T) {
	for _, tc := range []struct {
		name   string
		user   [6]float64
		target [6]float64
		want   float64
	}{
		{"identical vectors", [6]float64{4, 3, 2, 1, 5, 6}, [6]float64{4, 3, 2, 1, 5, 6}, 100.1},
		{"single active dimension off by 1", [6]float64{1, 0, 0, 0, 0, 0}, [6]float64{}, 36.1},
		{"mixed", [6]float64{4, 3, 0, 0, 0, 0}, [6]float64{3, 3, 0, 0, 0, 0}, 60.2},
		{"both all zero", [6]float64{}, [6]float64{}, 0},
	} {
		if got := talentsearch.GaussianCISimilarity(tc.user, tc.target); got != tc.want {
			t.Errorf("%s: got %v, want %v", tc.name, got, tc.want)
		}
	}
}
