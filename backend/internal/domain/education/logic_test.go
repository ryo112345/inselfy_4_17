package education_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
)

func TestValidateCreate(t *testing.T) {
	cases := []struct {
		name    string
		input   education.CreateInput
		wantErr error
	}{
		{"ok minimal", education.CreateInput{School: "Tokyo Univ"}, nil},
		{"ok full", education.CreateInput{
			School:    "Tokyo Univ",
			Degree:    strPtr("B.Eng Information Engineering"),
			StartYear: int16Ptr(2011),
			EndYear:   int16Ptr(2015),
		}, nil},
		{"empty school", education.CreateInput{School: "  "}, education.ErrSchoolRequired},
		{"school too long", education.CreateInput{School: strings.Repeat("あ", 201)}, education.ErrSchoolTooLong},
		{"degree too long", education.CreateInput{
			School: "u", Degree: strPtr(strings.Repeat("d", 201)),
		}, education.ErrDegreeTooLong},
		{"end before start", education.CreateInput{
			School:    "u",
			StartYear: int16Ptr(2020),
			EndYear:   int16Ptr(2015),
		}, education.ErrEndBeforeStart},
		{"year too old", education.CreateInput{
			School:    "u",
			StartYear: int16Ptr(1900),
		}, education.ErrYearOutOfRange},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := education.ValidateCreate(tc.input)
			if tc.wantErr == nil {
				if err != nil {
					t.Fatalf("got err %v, want nil", err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("got %v, want %v", err, tc.wantErr)
			}
		})
	}
}

func strPtr(s string) *string  { return &s }
func int16Ptr(v int16) *int16 { return &v }
