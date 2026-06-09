// Package auth owns local session authentication and keeps raw session tokens out of storage.
package auth

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
)

var (
	// ErrInvalidCredentials hides whether an email exists during login.
	ErrInvalidCredentials = errors.New("invalid credentials")
	// ErrSessionExpired indicates that a stored session is no longer valid.
	ErrSessionExpired = errors.New("session expired")
	// ErrSessionNotFound indicates that no session exists for a token hash.
	ErrSessionNotFound = errors.New("session not found")
	// ErrUserDisabled indicates that credentials are valid but the account cannot create sessions.
	ErrUserDisabled = errors.New("user disabled")
)

const (
	// UserStatusActive allows login and API access.
	UserStatusActive = "active"
	// UserStatusDisabled prevents new sessions while keeping the user record for audit history.
	UserStatusDisabled = "disabled"
)

// User is the authenticated API principal returned to clients without password hash data.
type User struct {
	ID           string              `json:"id"`
	Email        string              `json:"email"`
	DisplayName  string              `json:"displayName"`
	Status       string              `json:"status"`
	Roles        []string            `json:"roles,omitempty"`
	Permissions  []plugin.Permission `json:"permissions,omitempty"`
	PasswordHash string              `json:"-"`
	LastLoginAt  *time.Time          `json:"lastLoginAt,omitempty"`
	CreatedAt    time.Time           `json:"createdAt"`
	UpdatedAt    time.Time           `json:"updatedAt"`
}

// Store persists users and hashed sessions for the auth service.
type Store interface {
	UserByEmail(ctx context.Context, email string) (User, error)
	UserByID(ctx context.Context, id string) (User, error)
	SaveSession(ctx context.Context, session Session) error
	DeleteSession(ctx context.Context, tokenHash string) error
	SessionByTokenHash(ctx context.Context, tokenHash string) (Session, error)
	TouchLastLogin(ctx context.Context, userID string, at time.Time) error
}

// Service coordinates credential verification and session lifecycle rules.
type Service struct {
	store Store
	now   func() time.Time
	ttl   time.Duration
}

// LoginResult contains the public user and raw token produced by a successful login.
type LoginResult struct {
	User      User
	Token     string
	ExpiresAt time.Time
}

// NewService creates an auth service with a 24-hour session TTL.
func NewService(store Store) *Service {
	return &Service{
		store: store,
		now:   time.Now,
		ttl:   24 * time.Hour,
	}
}

// Login verifies credentials, stores a hashed session token, and returns the raw token once.
func (s *Service) Login(ctx context.Context, email string, password string) (LoginResult, error) {
	user, err := s.store.UserByEmail(ctx, normalizeEmail(email))
	if err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}
	if user.Status != "" && user.Status != UserStatusActive {
		return LoginResult{}, ErrUserDisabled
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
	if err := s.store.TouchLastLogin(ctx, user.ID, session.CreatedAt); err != nil {
		return LoginResult{}, err
	}
	user.LastLoginAt = &session.CreatedAt

	return LoginResult{
		User:      publicUser(user),
		Token:     token,
		ExpiresAt: session.ExpiresAt,
	}, nil
}

// Logout deletes the stored session for a raw token and treats empty tokens as already logged out.
func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.store.DeleteSession(ctx, HashToken(token))
}

// UserForToken resolves a raw bearer or cookie token into the public user and expires stale sessions.
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
	if user.Status != "" && user.Status != UserStatusActive {
		_ = s.store.DeleteSession(ctx, session.TokenHash)
		return User{}, ErrUserDisabled
	}
	return publicUser(user), nil
}

// NewMemoryStore creates a single-admin auth store for local and scaffolded runs.
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
		Status:       UserStatusActive,
		Roles:        []string{"admin"},
		Permissions:  AdminPermissions(),
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

// MemoryStore keeps users and sessions in process memory for tests and local-only runs.
type MemoryStore struct {
	mu           sync.RWMutex
	usersByID    map[string]User
	usersByEmail map[string]User
	sessions     map[string]Session
}

// UserByEmail returns the user for a normalized email or hides misses as invalid credentials.
func (m *MemoryStore) UserByEmail(_ context.Context, email string) (User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	user, ok := m.usersByEmail[normalizeEmail(email)]
	if !ok {
		return User{}, ErrInvalidCredentials
	}
	return user, nil
}

// UserByID returns the user for an ID or hides misses as invalid credentials.
func (m *MemoryStore) UserByID(_ context.Context, id string) (User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	user, ok := m.usersByID[id]
	if !ok {
		return User{}, ErrInvalidCredentials
	}
	return user, nil
}

// SaveSession stores a hashed session token.
func (m *MemoryStore) SaveSession(_ context.Context, session Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[session.TokenHash] = session
	return nil
}

// DeleteSession removes a session by token hash and is idempotent.
func (m *MemoryStore) DeleteSession(_ context.Context, tokenHash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, tokenHash)
	return nil
}

// SessionByTokenHash returns a stored session without accepting raw tokens.
func (m *MemoryStore) SessionByTokenHash(_ context.Context, tokenHash string) (Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	session, ok := m.sessions[tokenHash]
	if !ok {
		return Session{}, ErrSessionNotFound
	}
	return session, nil
}

// TouchLastLogin updates the in-memory user audit timestamp after a successful login.
func (m *MemoryStore) TouchLastLogin(_ context.Context, userID string, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	user, ok := m.usersByID[userID]
	if !ok {
		return ErrInvalidCredentials
	}
	user.LastLoginAt = &at
	user.UpdatedAt = at
	m.usersByID[userID] = user
	m.usersByEmail[user.Email] = user
	return nil
}

// AdminPermissions returns the complete built-in permission set for the seeded administrator role.
func AdminPermissions() []plugin.Permission {
	return []plugin.Permission{
		plugin.PermissionBlogRead,
		plugin.PermissionBlogWrite,
		plugin.PermissionStorageRead,
		plugin.PermissionStorageWrite,
		plugin.PermissionDomainRead,
		plugin.PermissionDomainWrite,
		plugin.PermissionSecretRead,
		plugin.PermissionSecretWrite,
		plugin.PermissionAuditRead,
		plugin.PermissionPluginManage,
		plugin.PermissionTaskSchedule,
	}
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func publicUser(user User) User {
	user.PasswordHash = ""
	return user
}
