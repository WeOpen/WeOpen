package auth

import (
	"context"
	"testing"
	"time"
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
	if result.User.Status != UserStatusActive {
		t.Fatalf("expected active user, got %q", result.User.Status)
	}
	if len(result.User.Roles) != 1 || result.User.Roles[0] != "admin" {
		t.Fatalf("expected admin role, got %+v", result.User.Roles)
	}
	if result.User.LastLoginAt == nil {
		t.Fatal("expected last login timestamp")
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

func TestServiceRequiresTOTPWhenMFAEnabled(t *testing.T) {
	t.Parallel()

	store, err := NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected memory store: %v", err)
	}
	service := NewService(store)
	enrollment, err := service.BeginMFAEnrollment(context.Background(), "usr_admin", "admin", "WeOpen")
	if err != nil {
		t.Fatalf("expected mfa enrollment: %v", err)
	}
	code, err := TOTPCode(enrollment.Secret, time.Now())
	if err != nil {
		t.Fatalf("expected totp code: %v", err)
	}
	if err := service.VerifyMFAEnrollment(context.Background(), "usr_admin", code); err != nil {
		t.Fatalf("expected mfa verify: %v", err)
	}

	if _, err := service.Login(context.Background(), "admin@example.com", "admin"); err != ErrMFACodeRequired {
		t.Fatalf("expected mfa required, got %v", err)
	}
	if _, err := service.LoginWithTOTP(context.Background(), "admin@example.com", "admin", "000000"); err != ErrInvalidMFACode {
		t.Fatalf("expected invalid mfa code, got %v", err)
	}
	if _, err := service.LoginWithTOTP(context.Background(), "admin@example.com", "admin", code); err != nil {
		t.Fatalf("expected login with mfa code: %v", err)
	}
}

func TestServiceRejectsDisabledUser(t *testing.T) {
	t.Parallel()

	hash, err := HashPassword("admin")
	if err != nil {
		t.Fatalf("expected hash: %v", err)
	}
	store := &disabledStore{
		user: User{
			ID:           "usr_disabled",
			Email:        "disabled@example.com",
			DisplayName:  "Disabled",
			Status:       UserStatusDisabled,
			PasswordHash: hash,
		},
	}
	service := NewService(store)

	if _, err := service.Login(context.Background(), "disabled@example.com", "admin"); err != ErrUserDisabled {
		t.Fatalf("expected disabled user error, got %v", err)
	}
}

func TestServiceRejectsDisabledUserSession(t *testing.T) {
	t.Parallel()

	session, token, err := NewSession("usr_disabled", time.Now(), time.Hour)
	if err != nil {
		t.Fatalf("expected session: %v", err)
	}
	store := &disabledStore{
		user: User{
			ID:          "usr_disabled",
			Email:       "disabled@example.com",
			DisplayName: "Disabled",
			Status:      UserStatusDisabled,
		},
		session: session,
	}
	service := NewService(store)

	if _, err := service.UserForToken(context.Background(), token); err != ErrUserDisabled {
		t.Fatalf("expected disabled user session error, got %v", err)
	}
}

type disabledStore struct {
	user    User
	session Session
}

func (s *disabledStore) UserByEmail(context.Context, string) (User, error) {
	return s.user, nil
}

func (s *disabledStore) UserByID(context.Context, string) (User, error) {
	return s.user, nil
}

func (s *disabledStore) SaveSession(context.Context, Session) error {
	return nil
}

func (s *disabledStore) DeleteSession(context.Context, string) error {
	return nil
}

func (s *disabledStore) SessionByTokenHash(_ context.Context, tokenHash string) (Session, error) {
	if s.session.TokenHash == "" || tokenHash != s.session.TokenHash {
		return Session{}, ErrSessionNotFound
	}
	return s.session, nil
}

func (s *disabledStore) TouchLastLogin(context.Context, string, time.Time) error {
	return nil
}
