package http

import (
	"context"
	"errors"
	"time"

	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

const (
	loginFailureLimit   = 5
	loginFailureWindow  = 15 * time.Minute
	loginCooldownPeriod = 5 * time.Minute
)

type loginRateLimiter struct {
	now   func() time.Time
	store auth.LoginRateLimitStore
}

func newLoginRateLimiter(store auth.LoginRateLimitStore) *loginRateLimiter {
	if store == nil {
		store = auth.NewMemoryLoginRateLimitStore()
	}
	return &loginRateLimiter{now: time.Now, store: store}
}

func (l *loginRateLimiter) Allow(ctx context.Context, key string) bool {
	if l == nil || key == "" {
		return true
	}

	now := l.now()
	attempt, err := l.store.LoginAttempt(ctx, key)
	if errors.Is(err, auth.ErrLoginAttemptNotFound) {
		return true
	}
	if err != nil {
		// Fail closed for active lockouts, fail open for store outages to avoid locking every user out.
		return true
	}
	if !attempt.LockedUntil.IsZero() && attempt.LockedUntil.After(now) {
		return false
	}
	if attempt.FirstFailure.IsZero() || now.Sub(attempt.FirstFailure) > loginFailureWindow {
		_ = l.store.DeleteLoginAttempt(ctx, key)
		return true
	}
	return true
}

func (l *loginRateLimiter) RecordFailure(ctx context.Context, key string) {
	if l == nil || key == "" {
		return
	}

	now := l.now()
	attempt, err := l.store.LoginAttempt(ctx, key)
	if err != nil || attempt.FirstFailure.IsZero() || now.Sub(attempt.FirstFailure) > loginFailureWindow {
		attempt = auth.LoginAttempt{Key: key, FirstFailure: now}
	}
	attempt.Failures++
	attempt.UpdatedAt = now
	if attempt.Failures >= loginFailureLimit {
		attempt.LockedUntil = now.Add(loginCooldownPeriod)
	}
	_ = l.store.SaveLoginAttempt(ctx, attempt)
}

func (l *loginRateLimiter) Reset(ctx context.Context, key string) {
	if l == nil || key == "" {
		return
	}
	_ = l.store.DeleteLoginAttempt(ctx, key)
}
