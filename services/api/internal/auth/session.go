package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

const SessionCookieName = "weopen_session"

type Session struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	CreatedAt time.Time
}

func NewSession(userID string, now time.Time, ttl time.Duration) (Session, string, error) {
	token, err := newToken(32)
	if err != nil {
		return Session{}, "", err
	}
	id, err := newToken(16)
	if err != nil {
		return Session{}, "", err
	}

	return Session{
		ID:        "ses_" + id,
		UserID:    userID,
		TokenHash: HashToken(token),
		ExpiresAt: now.Add(ttl),
		CreatedAt: now,
	}, token, nil
}

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func newToken(size int) (string, error) {
	bytes := make([]byte, size)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}
