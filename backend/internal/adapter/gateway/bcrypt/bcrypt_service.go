package bcrypt

import (
	"github.com/akiyama/inselfy/backend/internal/port"
	"golang.org/x/crypto/bcrypt"
)

type Service struct{}

var _ port.PasswordHasher = (*Service)(nil)

func NewService() *Service {
	return &Service{}
}

func (s *Service) Hash(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func (s *Service) Compare(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
