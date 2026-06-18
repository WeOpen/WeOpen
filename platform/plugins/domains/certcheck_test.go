package domains

import (
	"testing"
	"time"
)

func TestEvaluateCertificateExpiryThresholds(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 5, 15, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name       string
		expiresAt  time.Time
		wantStatus CertificateRiskStatus
		wantDays   int
	}{
		{name: "expired", expiresAt: now.Add(-time.Hour), wantStatus: CertificateStatusExpired, wantDays: -1},
		{name: "under seven days", expiresAt: now.Add(6 * 24 * time.Hour), wantStatus: CertificateStatusUnder7Days, wantDays: 6},
		{name: "under thirty days", expiresAt: now.Add(20 * 24 * time.Hour), wantStatus: CertificateStatusUnder30Days, wantDays: 20},
		{name: "valid", expiresAt: now.Add(90 * 24 * time.Hour), wantStatus: CertificateStatusValid, wantDays: 90},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			status := EvaluateCertificateExpiry(now, tt.expiresAt)
			if status.Status != tt.wantStatus || status.DaysRemaining != tt.wantDays {
				t.Fatalf("expected %s/%d, got %+v", tt.wantStatus, tt.wantDays, status)
			}
			if !status.CheckedAt.Equal(now) {
				t.Fatalf("expected checked_at to use now, got %+v", status)
			}
		})
	}
}
