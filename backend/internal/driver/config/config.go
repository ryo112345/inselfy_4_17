package config

import (
	"fmt"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	DBUser     string `env:"DB_USER" envDefault:"user"`
	DBPassword string `env:"DB_PASSWORD" envDefault:"password"`
	DBHost     string `env:"DB_HOST" envDefault:"localhost"`
	DBPort     int    `env:"DB_PORT" envDefault:"5432"`
	DBName     string `env:"DB_NAME" envDefault:"inselfy"`
	APIPort    int    `env:"API_PORT" envDefault:"8080"`

	LineChannelID     string `env:"LINE_CHANNEL_ID" envDefault:""`
	LineChannelSecret string `env:"LINE_CHANNEL_SECRET" envDefault:""`
	LineRedirectURI   string `env:"LINE_REDIRECT_URI" envDefault:"http://localhost:5173/auth/callback"`

	GoogleClientID string `env:"GOOGLE_CLIENT_ID" envDefault:""`
	JWTSecret      string `env:"JWT_SECRET" envDefault:"dev-secret-change-me"`

	InitialAdminEmail string `env:"INITIAL_ADMIN_EMAIL" envDefault:""`

	StripeSecretKey     string `env:"STRIPE_SECRET_KEY" envDefault:""`
	StripeWebhookSecret string `env:"STRIPE_WEBHOOK_SECRET" envDefault:""`

	// Storage: "local" or "r2"
	StorageBackend string `env:"STORAGE_BACKEND" envDefault:"local"`

	R2AccountID       string `env:"R2_ACCOUNT_ID" envDefault:""`
	R2AccessKeyID     string `env:"R2_ACCESS_KEY_ID" envDefault:""`
	R2SecretAccessKey string `env:"R2_SECRET_ACCESS_KEY" envDefault:""`
	R2Bucket          string `env:"R2_BUCKET" envDefault:""`
	R2PublicURL       string `env:"R2_PUBLIC_URL" envDefault:""`

	DBSSLMode string `env:"DB_SSLMODE" envDefault:"disable"`

	AppURL string `env:"APP_URL" envDefault:"http://localhost:5173"`
}

func Load() (*Config, error) {
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) DatabaseURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode)
}
