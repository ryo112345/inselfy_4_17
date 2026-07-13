package workvalues

import "math"

const (
	sigmaSq = 3.0
	maxIter = 100
	tol     = 1e-6
)

type BTResult struct {
	Mu []float64
	SE []float64
}

func EstimateBT(wins [N][N]int) BTResult {
	mu := make([]float64, N)

	for range maxIter {
		grad := make([]float64, N)
		H := make([][]float64, N)
		for i := range H {
			H[i] = make([]float64, N)
		}

		for i := range N {
			for j := i + 1; j < N; j++ {
				nij := wins[i][j] + wins[j][i]
				if nij == 0 {
					continue
				}
				pij := sigmoid(mu[i] - mu[j])
				w := pij * (1 - pij)

				grad[i] += float64(wins[i][j]) - float64(nij)*pij
				grad[j] -= float64(wins[i][j]) - float64(nij)*pij

				H[i][i] -= float64(nij) * w
				H[j][j] -= float64(nij) * w
				H[i][j] += float64(nij) * w
				H[j][i] += float64(nij) * w
			}
			grad[i] -= mu[i] / sigmaSq
			H[i][i] -= 1.0 / sigmaSq
		}

		delta := solveLinear(H, grad)
		if delta == nil {
			break
		}

		maxDelta := 0.0
		for i := range N {
			mu[i] -= delta[i]
			if d := math.Abs(delta[i]); d > maxDelta {
				maxDelta = d
			}
		}

		mean := 0.0
		for _, v := range mu {
			mean += v
		}
		mean /= float64(N)
		for i := range mu {
			mu[i] -= mean
		}

		if maxDelta < tol {
			break
		}
	}

	se := computeSE(mu, wins)
	return BTResult{Mu: mu, SE: se}
}

func computeSE(mu []float64, wins [N][N]int) []float64 {
	H := make([][]float64, N)
	for i := range H {
		H[i] = make([]float64, N)
	}

	for i := range N {
		for j := i + 1; j < N; j++ {
			nij := wins[i][j] + wins[j][i]
			if nij == 0 {
				continue
			}
			pij := sigmoid(mu[i] - mu[j])
			w := float64(nij) * pij * (1 - pij)
			H[i][i] += w
			H[j][j] += w
			H[i][j] -= w
			H[j][i] -= w
		}
		H[i][i] += 1.0 / sigmaSq
	}

	inv := invertMatrix(H)
	if inv == nil {
		se := make([]float64, N)
		for i := range se {
			se[i] = math.Inf(1)
		}
		return se
	}

	se := make([]float64, N)
	for i := range N {
		v := inv[i][i]
		if v < 0 {
			v = 0
		}
		se[i] = math.Sqrt(v)
	}
	return se
}

func sigmoid(x float64) float64 {
	return 1.0 / (1.0 + math.Exp(-x))
}

func solveLinear(hess [][]float64, b []float64) []float64 {
	n := len(hess)
	A := make([][]float64, n)
	for i := range A {
		row := make([]float64, n+1)
		for j := range n {
			row[j] = -hess[i][j]
		}
		row[n] = -b[i]
		A[i] = row
	}

	for col := range n {
		pivotRow := col
		pivotVal := math.Abs(A[col][col])
		for row := col + 1; row < n; row++ {
			if v := math.Abs(A[row][col]); v > pivotVal {
				pivotRow = row
				pivotVal = v
			}
		}
		if pivotVal < 1e-12 {
			return nil
		}
		if pivotRow != col {
			A[col], A[pivotRow] = A[pivotRow], A[col]
		}
		pivot := A[col][col]
		for j := col; j <= n; j++ {
			A[col][j] /= pivot
		}
		for row := range n {
			if row == col {
				continue
			}
			factor := A[row][col]
			for j := col; j <= n; j++ {
				A[row][j] -= factor * A[col][j]
			}
		}
	}

	result := make([]float64, n)
	for i := range result {
		result[i] = A[i][n]
	}
	return result
}

func invertMatrix(mat [][]float64) [][]float64 {
	n := len(mat)
	aug := make([][]float64, n)
	for i := range aug {
		row := make([]float64, 2*n)
		copy(row, mat[i])
		row[n+i] = 1
		aug[i] = row
	}

	for col := range n {
		pivotRow := col
		pivotVal := math.Abs(aug[col][col])
		for row := col + 1; row < n; row++ {
			if v := math.Abs(aug[row][col]); v > pivotVal {
				pivotRow = row
				pivotVal = v
			}
		}
		if pivotVal < 1e-12 {
			return nil
		}
		if pivotRow != col {
			aug[col], aug[pivotRow] = aug[pivotRow], aug[col]
		}
		pivot := aug[col][col]
		for j := range 2 * n {
			aug[col][j] /= pivot
		}
		for row := range n {
			if row == col {
				continue
			}
			factor := aug[row][col]
			for j := range 2 * n {
				aug[row][j] -= factor * aug[col][j]
			}
		}
	}

	result := make([][]float64, n)
	for i := range result {
		result[i] = aug[i][n:]
	}
	return result
}
