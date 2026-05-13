package auth

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrSessionExpired     = errors.New("session expired")
	ErrSessionNotFound    = errors.New("session not found")
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	DisplayName  string    `json:"displayName"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Store interface {
	UserByEmail(ctx context.Context, email string) (User, error)
	UserByID(ctx context.Context, id string) (User, error)
	SaveSession(ctx context.Context, session Session) error
	DeleteSession(ctx context.Context, tokenHash string) error
	SessionByTokenHash(ctx context.Context, tokenHash string) (Session, error)
}

type Service struct {
	store Store
	now   func() time.Time
	ttl   time.Duration
}

type LoginResult struct {
	User      User      `json:"user"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func NewService(store Store) *Service {
	return &Service{
		store: store,
		now:   time.Now,
		ttl:   24 * time.Hour,
	}
}

func (s *Service) Login(ctx context.Context, email string, password string) (LoginResult, error) {
	user, err := s.store.UserByEmail(ctx, normalizeEmail(email))
	if err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}
	if !VerifyPassword(user.PasswordHash, password) {
		return LoginResult{}, ErrInvalidCredentials
	}

	session, token, err := NewSession(user.ID, s.now(), s.ttl)
	if err != nil {
		return LoginResult{}, err
	}
	if err := s.store.SaveSession(ctx, session); err != nil {
		return LoginResult{}, err
	}

	return LoginResult{
		User:      publicUser(user),
		Token:     token,
		ExpiresAt: session.ExpiresAt,
	}, nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.store.DeleteSession(ctx, HashToken(token))
}

func (s *Service) UserForToken(ctx context.Context, token string) (User, error) {
	if token == "" {
		return User{}, ErrSessionNotFound
	}

	session, err := s.store.SessionByTokenHash(ctx, HashToken(token))
	if err != nil {
		return User{}, err
	}
	if !session.ExpiresAt.After(s.now()) {
		_ = s.store.DeleteSession(ctx, session.TokenHash)
		return User{}, ErrSessionExpired
	}

	user, err := s.store.UserByID(ctx, session.UserID)
	if err != nil {
		return User{}, err
	}
	return publicUser(user), nil
}

func NewMemoryStore(adminEmail string, adminPassword string) (*MemoryStore, error) {
	now := time.Now()
	passwordHash, err := HashPassword(adminPassword)
	if err != nil {
		return nil, err
	}
	user := User{
		ID:           "usr_admin",
		Email:        normalizeEmail(adminEmail),
		DisplayName:  "Admin",
		PasswordHash: passwordHash,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	return &MemoryStore{
		usersByID:    map[string]User{user.ID: user},
		usersByEmail: map[string]User{user.Email: user},
		sessions:     map[string]Session{},
	}, nil
}

type MemoryStore struct {
	mu           sync.RWMutex
	usersByID    map[string]User
	usersByEmail map[string]User
	sessions     map[string]Session
}

func (m *MemoryStore) UserByEmail(_ context.Context, email string) (User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	user, ok := m.usersByEmail[normalizeEmail(email)]
	if !ok {
		return User{}, ErrInvalidCredentials
	}
	return user, nil
}

func (m *MemoryStore) UserByID(_ context.Context, id string) (User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	user, ok := m.usersByID[id]
	if !ok {
		return User{}, ErrInvalidCredentials
	}
	return user, nil
}

func (m *MemoryStore) SaveSession(_ context.Context, session Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[session.TokenHash] = session
	return nil
}

func (m *MemoryStore) DeleteSession(_ context.Context, tokenHash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, tokenHash)
	return nil
}

func (m *MemoryStore) SessionByTokenHash(_ context.Context, tokenHash string) (Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	session, ok := m.sessions[tokenHash]
	if !ok {
		return Session{}, ErrSessionNotFound
	}
	return session, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func publicUser(user User) User {
	user.PasswordHash = ""
	return user
}
