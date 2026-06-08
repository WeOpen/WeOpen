package domains

import (
	"context"
	"crypto/tls"
	"errors"
	"math"
	"net"
	"strings"
	"time"
)

// TLSCertificateChecker performs a bounded TLS handshake to inspect certificate expiry.
type TLSCertificateChecker struct {
	now     func() time.Time
	timeout time.Duration
}

// NewTLSCertificateChecker creates the default certificate checker used by provider sync.
func NewTLSCertificateChecker() TLSCertificateChecker {
	return TLSCertificateChecker{now: time.Now, timeout: 5 * time.Second}
}

// CheckCertificate connects to domain:443 and returns the leaf certificate's expiry risk.
func (c TLSCertificateChecker) CheckCertificate(ctx context.Context, domain string) (CertificateStatus, error) {
	domain = strings.Trim(strings.TrimSpace(domain), ".")
	if domain == "" {
		return CertificateStatus{}, errors.New("domain is required")
	}
	now := c.now
	if now == nil {
		now = time.Now
	}
	timeout := c.timeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	dialer := tls.Dialer{
		NetDialer: &net.Dialer{Timeout: timeout},
		Config:    &tls.Config{ServerName: domain, MinVersion: tls.VersionTLS12},
	}
	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(domain, "443"))
	if err != nil {
		return CertificateStatus{}, err
	}
	defer conn.Close()

	tlsConn, ok := conn.(*tls.Conn)
	if !ok {
		return CertificateStatus{}, errors.New("tls connection state unavailable")
	}
	state := tlsConn.ConnectionState()
	if len(state.PeerCertificates) == 0 {
		return CertificateStatus{}, errors.New("no peer certificate")
	}
	certificate := state.PeerCertificates[0]
	status := EvaluateCertificateExpiry(now().UTC(), certificate.NotAfter.UTC())
	status.Issuer = certificate.Issuer.CommonName
	return status, nil
}

// EvaluateCertificateExpiry maps an expiry instant into the domain plugin's warning thresholds.
func EvaluateCertificateExpiry(now time.Time, expiresAt time.Time) CertificateStatus {
	now = now.UTC()
	expiresAt = expiresAt.UTC()
	duration := expiresAt.Sub(now)
	daysRemaining := int(math.Floor(duration.Hours() / 24))
	if duration < 0 {
		daysRemaining = -int(math.Ceil(math.Abs(duration.Hours()) / 24))
	}

	status := CertificateStatusValid
	switch {
	case !expiresAt.After(now):
		status = CertificateStatusExpired
	case daysRemaining < 7:
		status = CertificateStatusUnder7Days
	case daysRemaining < 30:
		status = CertificateStatusUnder30Days
	}
	return CertificateStatus{
		Status:        status,
		ExpiresAt:     expiresAt,
		DaysRemaining: daysRemaining,
		CheckedAt:     now,
	}
}
