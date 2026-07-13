// Package cast provides saturating integer conversions.
// 呼び出し元の値は domain バリデーションやページネーションのクランプで
// 範囲が保証されている前提で、変換時のオーバーフロー（wrap-around）だけを
// 機械的に防ぐ（gosec G109/G115 対応）。
package cast

import "math"

// Int32 は int を int32 に飽和変換する。
func Int32(v int) int32 {
	if v > math.MaxInt32 {
		return math.MaxInt32
	}
	if v < math.MinInt32 {
		return math.MinInt32
	}
	return int32(v)
}

// Int16 は int を int16 に飽和変換する。
func Int16(v int) int16 {
	if v > math.MaxInt16 {
		return math.MaxInt16
	}
	if v < math.MinInt16 {
		return math.MinInt16
	}
	return int16(v)
}

// Int16From32 は int32 を int16 に飽和変換する。
func Int16From32(v int32) int16 {
	if v > math.MaxInt16 {
		return math.MaxInt16
	}
	if v < math.MinInt16 {
		return math.MinInt16
	}
	return int16(v)
}
