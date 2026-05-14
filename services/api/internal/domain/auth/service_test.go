package auth

import (
	"context"
	"testing"
)

func TestHashPasswordVerifiesOriginalPassword(t *testing.T) {
	t.Parallel()

	hash, err := HashPassword("correct-password")
	if err != nil {
		t.Fatalf("expected password hash: %v", err)
	}

	if !VerifyPassword(hash, "correct-password") {
		t.Fatal("expected original password to verify")
	}
	if VerifyPassword(hash, "wrong-password") {
		t.Fatal("expected wrong password to fail")
	}
}

func TestServiceLoginCreatesSession(t *testing.T) {
	t.Parallel()

	store, err := NewMemoryStore("Admin@Example.com", "admin")
	if err != nil {
		t.Fatalf("expected memory store: %v", err)
	}
	service := NewService(store)

	result, err := service.Login(context.Background(), "admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected login to succeed: %v", err)
	}
	if result.Token == "" {
		t.Fatal("expected session token")
	}
	if result.User.PasswordHash != "" {
		t.Fatal("expected password hash to be redacted")
	}

	user, err := service.UserForToken(context.Background(), result.Token)
	if err != nil {
		t.Fatalf("expected token to load user: %v", err)
	}
	if user.Email != "admin@example.com" {
		t.Fatalf("expected admin email, got %q", user.Email)
	}
}

func TestServiceRejectsInvalidPassword(t *testing.T) {
	t.Parallel()

	store, err := NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected memory store: %v", err)
	}
	service := NewService(store)

	if _, err := service.Login(context.Background(), "admin@example.com", "wrong"); err != ErrInvalidCredentials {
		t.Fatalf("expected invalid credentials, got %v", err)
	}
}
