package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	totpDigits     = 6
	totpPeriod     = 30 * time.Second
	totpSecretSize = 20
)

// NewTOTPSecret generates a base32 TOTP secret without padding.
func NewTOTPSecret() (string, error) {
	bytes := make([]byte, totpSecretSize)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate totp secret: %w", err)
	}
	return strings.TrimRight(base32.StdEncoding.EncodeToString(bytes), "="), nil
}

// OTPAuthURL returns a standard authenticator-app provisioning URL.
func OTPAuthURL(issuer string, account string, secret string) string {
	if strings.TrimSpace(issuer) == "" {
		issuer = "WeOpen"
	}
	label := url.PathEscape(issuer + ":" + account)
	values := url.Values{}
	values.Set("secret", secret)
	values.Set("issuer", issuer)
	values.Set("algorithm", "SHA1")
	values.Set("digits", strconv.Itoa(totpDigits))
	values.Set("period", strconv.Itoa(int(totpPeriod.Seconds())))
	return "otpauth://totp/" + label + "?" + values.Encode()
}

// VerifyTOTPCode checks a 6-digit TOTP code with one time step of clock skew.
func VerifyTOTPCode(secret string, code string, now time.Time) bool {
	code = strings.TrimSpace(code)
	if len(code) != totpDigits {
		return false
	}
	for _, char := range code {
		if char < '0' || char > '9' {
			return false
		}
	}
	counter := now.Unix() / int64(totpPeriod.Seconds())
	for offset := int64(-1); offset <= 1; offset++ {
		expected, err := totpCode(secret, counter+offset)
		if err != nil {
			return false
		}
		if hmac.Equal([]byte(expected), []byte(code)) {
			return true
		}
	}
	return false
}

// TOTPCode returns the current 6-digit TOTP code for a secret.
func TOTPCode(secret string, now time.Time) (string, error) {
	return totpCode(secret, now.Unix()/int64(totpPeriod.Seconds()))
}

func totpCode(secret string, counter int64) (string, error) {
	secret = strings.ToUpper(strings.TrimSpace(secret))
	padding := len(secret) % 8
	if padding > 0 {
		secret += strings.Repeat("=", 8-padding)
	}
	key, err := base32.StdEncoding.DecodeString(secret)
	if err != nil {
		return "", err
	}
	var counterBytes [8]byte
	binary.BigEndian.PutUint64(counterBytes[:], uint64(counter))
	mac := hmac.New(sha1.New, key)
	if _, err := mac.Write(counterBytes[:]); err != nil {
		return "", err
	}
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	binaryCode := (uint32(sum[offset])&0x7f)<<24 |
		(uint32(sum[offset+1])&0xff)<<16 |
		(uint32(sum[offset+2])&0xff)<<8 |
		(uint32(sum[offset+3]) & 0xff)
	return fmt.Sprintf("%06d", binaryCode%1_000_000), nil
}
