package http

import (
	"sync"
	"time"
)

const (
	loginFailureLimit   = 5
	loginFailureWindow  = 15 * time.Minute
	loginCooldownPeriod = 5 * time.Minute
)

type loginRateLimiter struct {
	mu       sync.Mutex
	now      func() time.Time
	attempts map[string]loginAttempt
}

type loginAttempt struct {
	Failures     int
	FirstFailure time.Time
	LockedUntil  time.Time
}

func newLoginRateLimiter() *loginRateLimiter {
	return &loginRateLimiter{
		now:      time.Now,
		attempts: map[string]loginAttempt{},
	}
}

func (l *loginRateLimiter) Allow(key string) bool {
	if l == nil || key == "" {
		return true
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	attempt := l.attempts[key]
	if !attempt.LockedUntil.IsZero() && attempt.LockedUntil.After(now) {
		return false
	}
	if attempt.FirstFailure.IsZero() || now.Sub(attempt.FirstFailure) > loginFailureWindow {
		delete(l.attempts, key)
		return true
	}
	return true
}

func (l *loginRateLimiter) RecordFailure(key string) {
	if l == nil || key == "" {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	attempt := l.attempts[key]
	if attempt.FirstFailure.IsZero() || now.Sub(attempt.FirstFailure) > loginFailureWindow {
		attempt = loginAttempt{FirstFailure: now}
	}
	attempt.Failures++
	if attempt.Failures >= loginFailureLimit {
		attempt.LockedUntil = now.Add(loginCooldownPeriod)
	}
	l.attempts[key] = attempt
}

func (l *loginRateLimiter) Reset(key string) {
	if l == nil || key == "" {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}
