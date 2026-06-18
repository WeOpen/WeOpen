// Package auth owns local session authentication and keeps raw session tokens out of storage.
package auth

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
)

var (
	// ErrInvalidCredentials hides whether an email exists during login.
	ErrInvalidCredentials = errors.New("invalid credentials")
	// ErrInvalidPasswordPolicy indicates a requested password does not meet policy.
	ErrInvalidPasswordPolicy = errors.New("password does not meet policy")
	// ErrSessionExpired indicates that a stored session is no longer valid.
	ErrSessionExpired = errors.New("session expired")
	// ErrSessionNotFound indicates that no session exists for a token hash.
	ErrSessionNotFound = errors.New("session not found")
	// ErrUserDisabled indicates that credentials are valid but the account cannot create sessions.
	ErrUserDisabled = errors.New("user disabled")
	// ErrMFACodeRequired indicates credentials are valid but a TOTP code is required.
	ErrMFACodeRequired = errors.New("mfa code required")
	// ErrInvalidMFACode indicates a provided TOTP code is missing or invalid.
	ErrInvalidMFACode = errors.New("invalid mfa code")
	// ErrUserNotFound indicates that an administrative user lookup missed.
	ErrUserNotFound = errors.New("user not found")
	// ErrRoleNotFound indicates that an administrative role lookup missed.
	ErrRoleNotFound = errors.New("role not found")
	// ErrLoginAttemptNotFound indicates that no login attempt bucket exists for a key.
	ErrLoginAttemptNotFound = errors.New("login attempt not found")
)

const (
	// UserStatusActive allows login and API access.
	UserStatusActive = "active"
	// UserStatusDisabled prevents new sessions while keeping the user record for audit history.
	UserStatusDisabled = "disabled"
)

// User is the authenticated API principal returned to clients without password hash data.
type User struct {
	ID                 string              `json:"id"`
	Email              string              `json:"email"`
	DisplayName        string              `json:"displayName"`
	Status             string              `json:"status"`
	Roles              []string            `json:"roles,omitempty"`
	Permissions        []plugin.Permission `json:"permissions,omitempty"`
	MustChangePassword bool                `json:"mustChangePassword"`
	PasswordHash       string              `json:"-"`
	PasswordChangedAt  *time.Time          `json:"passwordChangedAt,omitempty"`
	MFAEnabled         bool                `json:"mfaEnabled"`
	MFASecret          string              `json:"-"`
	LastLoginAt        *time.Time          `json:"lastLoginAt,omitempty"`
	CreatedAt          time.Time           `json:"createdAt"`
	UpdatedAt          time.Time           `json:"updatedAt"`
}

// Role is a built-in or administrator-created RBAC role.
type Role struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Permissions []plugin.Permission `json:"permissions"`
	CreatedAt   time.Time           `json:"createdAt"`
	UpdatedAt   time.Time           `json:"updatedAt"`
}

// SessionInfo is the browser-safe session management view.
type SessionInfo struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
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

// AdminStore extends Store with user, role, and session management operations.
type AdminStore interface {
	ListUsers(ctx context.Context) ([]User, error)
	ListRoles(ctx context.Context) ([]Role, error)
	CreateUser(ctx context.Context, user User, roleNames []string) (User, error)
	UpdateUser(ctx context.Context, userID string, update UserUpdate) (User, error)
	ListSessions(ctx context.Context, userID string) ([]SessionInfo, error)
	DeleteSessionByID(ctx context.Context, sessionID string) error
	DeleteSessionsForUser(ctx context.Context, userID string, exceptTokenHash string) error
	UpdatePassword(ctx context.Context, userID string, passwordHash string, changedAt time.Time) error
}

// MFAStore extends Store with TOTP enrollment persistence.
type MFAStore interface {
	UpdateMFA(ctx context.Context, userID string, secret string, enabled bool) error
}

// UserUpdate carries optional fields for administrative user updates.
type UserUpdate struct {
	DisplayName *string
	Status      *string
	RoleNames   *[]string
}

// LoginAttempt stores a shared login failure bucket for rate limiting.
type LoginAttempt struct {
	Key          string
	Failures     int
	FirstFailure time.Time
	LockedUntil  time.Time
	UpdatedAt    time.Time
}

// LoginRateLimitStore persists login attempts across API instances when backed by SQL.
type LoginRateLimitStore interface {
	LoginAttempt(ctx context.Context, key string) (LoginAttempt, error)
	SaveLoginAttempt(ctx context.Context, attempt LoginAttempt) error
	DeleteLoginAttempt(ctx context.Context, key string) error
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

// MFAEnrollment returns the secret material needed to finish TOTP setup.
type MFAEnrollment struct {
	Secret     string `json:"secret"`
	OTPAuthURL string `json:"otpauthUrl"`
}

// NewService creates an auth service with a 24-hour session TTL.
func NewService(store Store) *Service {
	return &Service{
		store: store,
		now:   time.Now,
		ttl:   24 * time.Hour,
	}
}

// Store returns the configured persistence boundary for HTTP admin adapters.
func (s *Service) Store() Store {
	return s.store
}

// Login verifies credentials, stores a hashed session token, and returns the raw token once.
func (s *Service) Login(ctx context.Context, email string, password string) (LoginResult, error) {
	return s.LoginWithTOTP(ctx, email, password, "")
}

// LoginWithTOTP verifies credentials and, when enabled, the user's TOTP code.
func (s *Service) LoginWithTOTP(ctx context.Context, email string, password string, totpCode string) (LoginResult, error) {
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
	if user.MFAEnabled {
		if strings.TrimSpace(totpCode) == "" {
			return LoginResult{}, ErrMFACodeRequired
		}
		if !VerifyTOTPCode(user.MFASecret, totpCode, s.now()) {
			return LoginResult{}, ErrInvalidMFACode
		}
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

// ChangePassword verifies the current password, enforces policy on the new one, and revokes other sessions.
func (s *Service) ChangePassword(ctx context.Context, userID string, currentPassword string, newPassword string, currentToken string) error {
	user, err := s.store.UserByID(ctx, userID)
	if err != nil {
		return err
	}
	if !VerifyPassword(user.PasswordHash, currentPassword) {
		return ErrInvalidCredentials
	}
	if err := ValidatePasswordPolicy(newPassword); err != nil {
		return err
	}
	passwordHash, err := HashPassword(newPassword)
	if err != nil {
		return err
	}
	adminStore, ok := s.store.(AdminStore)
	if !ok {
		return errors.New("auth store does not support password updates")
	}
	changedAt := s.now()
	if err := adminStore.UpdatePassword(ctx, userID, passwordHash, changedAt); err != nil {
		return err
	}
	return adminStore.DeleteSessionsForUser(ctx, userID, HashToken(currentToken))
}

// BeginMFAEnrollment stores a disabled TOTP secret after confirming the current password.
func (s *Service) BeginMFAEnrollment(ctx context.Context, userID string, currentPassword string, issuer string) (MFAEnrollment, error) {
	user, err := s.store.UserByID(ctx, userID)
	if err != nil {
		return MFAEnrollment{}, err
	}
	if !VerifyPassword(user.PasswordHash, currentPassword) {
		return MFAEnrollment{}, ErrInvalidCredentials
	}
	secret, err := NewTOTPSecret()
	if err != nil {
		return MFAEnrollment{}, err
	}
	mfaStore, ok := s.store.(MFAStore)
	if !ok {
		return MFAEnrollment{}, errors.New("auth store does not support mfa")
	}
	if err := mfaStore.UpdateMFA(ctx, userID, secret, false); err != nil {
		return MFAEnrollment{}, err
	}
	return MFAEnrollment{
		Secret:     secret,
		OTPAuthURL: OTPAuthURL(issuer, user.Email, secret),
	}, nil
}

// VerifyMFAEnrollment enables TOTP after a valid code against the stored pending secret.
func (s *Service) VerifyMFAEnrollment(ctx context.Context, userID string, code string) error {
	user, err := s.store.UserByID(ctx, userID)
	if err != nil {
		return err
	}
	if !VerifyTOTPCode(user.MFASecret, code, s.now()) {
		return ErrInvalidMFACode
	}
	mfaStore, ok := s.store.(MFAStore)
	if !ok {
		return errors.New("auth store does not support mfa")
	}
	return mfaStore.UpdateMFA(ctx, userID, user.MFASecret, true)
}

// DisableMFA clears TOTP after confirming the current password.
func (s *Service) DisableMFA(ctx context.Context, userID string, currentPassword string) error {
	user, err := s.store.UserByID(ctx, userID)
	if err != nil {
		return err
	}
	if !VerifyPassword(user.PasswordHash, currentPassword) {
		return ErrInvalidCredentials
	}
	mfaStore, ok := s.store.(MFAStore)
	if !ok {
		return errors.New("auth store does not support mfa")
	}
	return mfaStore.UpdateMFA(ctx, userID, "", false)
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
		MFAEnabled:   false,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	adminRole := Role{
		ID:          "role_admin",
		Name:        "admin",
		Description: "Built-in administrator with every platform permission",
		Permissions: AdminPermissions(),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	return &MemoryStore{
		usersByID:    map[string]User{user.ID: user},
		usersByEmail: map[string]User{user.Email: user},
		rolesByName:  map[string]Role{adminRole.Name: adminRole},
		sessions:     map[string]Session{},
	}, nil
}

// MemoryStore keeps users and sessions in process memory for tests and local-only runs.
type MemoryStore struct {
	mu           sync.RWMutex
	usersByID    map[string]User
	usersByEmail map[string]User
	rolesByName  map[string]Role
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

// ListUsers returns users sorted by email.
func (m *MemoryStore) ListUsers(_ context.Context) ([]User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	users := make([]User, 0, len(m.usersByID))
	for _, user := range m.usersByID {
		users = append(users, publicUser(user))
	}
	sortUsers(users)
	return users, nil
}

// ListRoles returns available roles sorted by name.
func (m *MemoryStore) ListRoles(_ context.Context) ([]Role, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	roles := make([]Role, 0, len(m.rolesByName))
	for _, role := range m.rolesByName {
		roles = append(roles, role)
	}
	sortRoles(roles)
	return roles, nil
}

// CreateUser creates a new local user and marks the password for first-change.
func (m *MemoryStore) CreateUser(_ context.Context, user User, roleNames []string) (User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	user.Email = normalizeEmail(user.Email)
	if user.Email == "" || user.PasswordHash == "" {
		return User{}, ErrInvalidCredentials
	}
	if _, exists := m.usersByEmail[user.Email]; exists {
		return User{}, ErrInvalidCredentials
	}
	for _, roleName := range roleNames {
		if _, ok := m.rolesByName[roleName]; !ok {
			return User{}, ErrRoleNotFound
		}
	}
	now := time.Now()
	if user.ID == "" {
		user.ID = "usr_" + newMemoryID(user.Email)
	}
	if user.Status == "" {
		user.Status = UserStatusActive
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = now
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = now
	}
	user.Roles = append([]string{}, roleNames...)
	user.Permissions = permissionsForRoles(m.rolesByName, roleNames)
	m.usersByID[user.ID] = user
	m.usersByEmail[user.Email] = user
	return publicUser(user), nil
}

// UpdateUser changes mutable user fields and revokes sessions if the user is disabled.
func (m *MemoryStore) UpdateUser(_ context.Context, userID string, update UserUpdate) (User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	user, ok := m.usersByID[userID]
	if !ok {
		return User{}, ErrUserNotFound
	}
	if update.DisplayName != nil {
		user.DisplayName = strings.TrimSpace(*update.DisplayName)
	}
	if update.Status != nil {
		status := strings.TrimSpace(*update.Status)
		if status != UserStatusActive && status != UserStatusDisabled {
			return User{}, ErrInvalidCredentials
		}
		user.Status = status
		if status == UserStatusDisabled {
			for tokenHash, session := range m.sessions {
				if session.UserID == userID {
					delete(m.sessions, tokenHash)
				}
			}
		}
	}
	if update.RoleNames != nil {
		for _, roleName := range *update.RoleNames {
			if _, ok := m.rolesByName[roleName]; !ok {
				return User{}, ErrRoleNotFound
			}
		}
		user.Roles = append([]string{}, (*update.RoleNames)...)
		user.Permissions = permissionsForRoles(m.rolesByName, user.Roles)
	}
	user.UpdatedAt = time.Now()
	m.usersByID[user.ID] = user
	m.usersByEmail[user.Email] = user
	return publicUser(user), nil
}

// ListSessions lists active sessions, optionally scoped to one user.
func (m *MemoryStore) ListSessions(_ context.Context, userID string) ([]SessionInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	sessions := make([]SessionInfo, 0, len(m.sessions))
	for _, session := range m.sessions {
		if userID != "" && session.UserID != userID {
			continue
		}
		sessions = append(sessions, SessionInfo{
			ID:        session.ID,
			UserID:    session.UserID,
			ExpiresAt: session.ExpiresAt,
			CreatedAt: session.CreatedAt,
		})
	}
	sortSessions(sessions)
	return sessions, nil
}

// DeleteSessionByID revokes one session by public ID.
func (m *MemoryStore) DeleteSessionByID(_ context.Context, sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for tokenHash, session := range m.sessions {
		if session.ID == sessionID {
			delete(m.sessions, tokenHash)
			return nil
		}
	}
	return nil
}

// DeleteSessionsForUser revokes all sessions for a user except one optional token hash.
func (m *MemoryStore) DeleteSessionsForUser(_ context.Context, userID string, exceptTokenHash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for tokenHash, session := range m.sessions {
		if session.UserID == userID && tokenHash != exceptTokenHash {
			delete(m.sessions, tokenHash)
		}
	}
	return nil
}

// UpdatePassword stores a new hash and clears first-change status.
func (m *MemoryStore) UpdatePassword(_ context.Context, userID string, passwordHash string, changedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	user, ok := m.usersByID[userID]
	if !ok {
		return ErrUserNotFound
	}
	user.PasswordHash = passwordHash
	user.MustChangePassword = false
	user.PasswordChangedAt = &changedAt
	user.UpdatedAt = changedAt
	m.usersByID[user.ID] = user
	m.usersByEmail[user.Email] = user
	return nil
}

// UpdateMFA stores or clears TOTP state.
func (m *MemoryStore) UpdateMFA(_ context.Context, userID string, secret string, enabled bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	user, ok := m.usersByID[userID]
	if !ok {
		return ErrUserNotFound
	}
	user.MFASecret = secret
	user.MFAEnabled = enabled
	user.UpdatedAt = time.Now()
	m.usersByID[user.ID] = user
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
		plugin.PermissionUserManage,
	}
}

func sortUsers(users []User) {
	sort.Slice(users, func(i, j int) bool {
		return users[i].Email < users[j].Email
	})
}

func sortRoles(roles []Role) {
	sort.Slice(roles, func(i, j int) bool {
		return roles[i].Name < roles[j].Name
	})
}

func sortSessions(sessions []SessionInfo) {
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].CreatedAt.After(sessions[j].CreatedAt)
	})
}

func permissionsForRoles(rolesByName map[string]Role, roleNames []string) []plugin.Permission {
	seen := map[plugin.Permission]struct{}{}
	var permissions []plugin.Permission
	for _, roleName := range roleNames {
		role, ok := rolesByName[roleName]
		if !ok {
			continue
		}
		for _, permission := range role.Permissions {
			if _, exists := seen[permission]; exists {
				continue
			}
			seen[permission] = struct{}{}
			permissions = append(permissions, permission)
		}
	}
	return permissions
}

func newMemoryID(seed string) string {
	value := strings.NewReplacer("@", "-", ".", "-", "_", "-").Replace(seed)
	return strings.Trim(value, "-")
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func publicUser(user User) User {
	user.PasswordHash = ""
	return user
}
