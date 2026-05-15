package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type R2 struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

func NewR2(accountID, accessKeyID, secretAccessKey, bucket, publicURL string) *R2 {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
	client := s3.New(s3.Options{
		Region:      "auto",
		Credentials: credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
		BaseEndpoint: &endpoint,
	})
	return &R2{client: client, bucket: bucket, publicURL: publicURL}
}

func (r *R2) Save(ctx context.Context, key string, reader io.Reader) (string, error) {
	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: &r.bucket,
		Key:    &key,
		Body:   reader,
	})
	if err != nil {
		return "", fmt.Errorf("r2 put: %w", err)
	}
	return r.URL(key), nil
}

func (r *R2) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := r.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &r.bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, fmt.Errorf("r2 get: %w", err)
	}
	return out.Body, nil
}

func (r *R2) Delete(ctx context.Context, key string) error {
	_, err := r.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: &r.bucket,
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("r2 delete: %w", err)
	}
	return nil
}

func (r *R2) URL(key string) string {
	return fmt.Sprintf("%s/%s", r.publicURL, key)
}
