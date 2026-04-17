package skill_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/skill"
)

func TestValidateName(t *testing.T) {
	cases := []struct {
		name    string
		input   string
		want    string
		wantErr error
	}{
		{"ok trim", "  Go ", "Go", nil},
		{"ok japanese", "ドメイン駆動設計", "ドメイン駆動設計", nil},
		{"empty", "   ", "", skill.ErrNameRequired},
		{"too long", strings.Repeat("あ", 101), "", skill.ErrNameTooLong},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := skill.ValidateName(tc.input)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("got %v, want %v", err, tc.wantErr)
			}
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}
