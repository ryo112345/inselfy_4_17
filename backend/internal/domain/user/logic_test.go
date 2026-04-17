package user_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

func TestParseUsername(t *testing.T) {
	cases := []struct {
		name    string
		input   string
		want    string
		wantErr error
	}{
		{"valid", "alice", "alice", nil},
		{"valid with underscore", "a_b_c", "a_b_c", nil},
		{"valid with at prefix", "@alice", "alice", nil},
		{"valid 3 chars", "aaa", "aaa", nil},
		{"valid 20 chars", strings.Repeat("a", 20), strings.Repeat("a", 20), nil},
		{"too short", "ab", "", user.ErrInvalidUsername},
		{"too long", strings.Repeat("a", 21), "", user.ErrInvalidUsername},
		{"bad chars", "alice!", "", user.ErrInvalidUsername},
		{"space", "al ice", "", user.ErrInvalidUsername},
		{"empty", "", "", user.ErrInvalidUsername},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := user.ParseUsername(tc.input)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("err: got %v, want %v", err, tc.wantErr)
			}
			if got.String() != tc.want {
				t.Fatalf("got %q, want %q", got.String(), tc.want)
			}
		})
	}
}

func TestValidateName(t *testing.T) {
	cases := []struct {
		name    string
		input   string
		wantErr error
	}{
		{"ok", "Alice", nil},
		{"ok japanese", "山田太郎", nil},
		{"ok 100 chars", strings.Repeat("あ", 100), nil},
		{"empty", "", user.ErrNameRequired},
		{"whitespace only", "   ", user.ErrNameRequired},
		{"too long", strings.Repeat("あ", 101), user.ErrNameTooLong},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := user.ValidateName(tc.input); !errors.Is(err, tc.wantErr) {
				t.Fatalf("got %v, want %v", err, tc.wantErr)
			}
		})
	}
}

func TestValidateProfileColor(t *testing.T) {
	ok := "#3D8B6E"
	bad := "3D8B6E"
	short := "#ABC"

	if err := user.ValidateProfileColor(&ok); err != nil {
		t.Fatalf("expected no error for %q, got %v", ok, err)
	}
	if err := user.ValidateProfileColor(nil); err != nil {
		t.Fatalf("nil should be fine, got %v", err)
	}
	if err := user.ValidateProfileColor(&bad); !errors.Is(err, user.ErrInvalidProfileColor) {
		t.Fatalf("expected ErrInvalidProfileColor, got %v", err)
	}
	if err := user.ValidateProfileColor(&short); !errors.Is(err, user.ErrInvalidProfileColor) {
		t.Fatalf("expected ErrInvalidProfileColor for short, got %v", err)
	}
}

func TestValidateUpdateProfile_LengthCaps(t *testing.T) {
	tooLong := strings.Repeat("a", 2001)
	input := user.UpdateProfileInput{About: ptrPtrString(&tooLong)}
	if err := user.ValidateUpdateProfile(input); !errors.Is(err, user.ErrAboutTooLong) {
		t.Fatalf("expected ErrAboutTooLong, got %v", err)
	}
}

func TestValidateUpdateProfile_AllowsClearing(t *testing.T) {
	// **string pointing to nil *string means "clear the field"
	var nilPtr *string
	input := user.UpdateProfileInput{
		Headline:     &nilPtr,
		About:        &nilPtr,
		Location:     &nilPtr,
		ProfileColor: &nilPtr,
	}
	if err := user.ValidateUpdateProfile(input); err != nil {
		t.Fatalf("clearing fields should validate, got %v", err)
	}
}

func ptrPtrString(s *string) **string { return &s }
