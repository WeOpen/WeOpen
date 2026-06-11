package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"unicode"

	"crypto/pbkdf2"
)

const (
	passwordHashAlgorithm = "pbkdf2-sha256"
	passwordHashIter      = 210_000
	passwordSaltBytes     = 16
	passwordKeyBytes      = 32
)

func HashPassword(password string) (string, error) {
	if password == "" {
		return "", ErrInvalidCredentials
	}

	salt := make([]byte, passwordSaltBytes)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}

	key, err := pbkdf2.Key(sha256.New, password, salt, passwordHashIter, passwordKeyBytes)
	if err != nil {
		return "", fmt.Errorf("derive password key: %w", err)
	}

	return strings.Join([]string{
		passwordHashAlgorithm,
		strconv.Itoa(passwordHashIter),
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	}, "$"), nil
}

// ValidatePasswordPolicy enforces the minimum policy for new or changed passwords.
func ValidatePasswordPolicy(password string) error {
	if len([]rune(password)) < 12 {
		return ErrInvalidPasswordPolicy
	}
	var hasLower, hasUpper, hasDigit, hasSymbol bool
	for _, char := range password {
		switch {
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSymbol = true
		}
	}
	if !hasLower || !hasUpper || !hasDigit || !hasSymbol {
		return ErrInvalidPasswordPolicy
	}
	return nil
}

func VerifyPassword(encoded string, password string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 4 || parts[0] != passwordHashAlgorithm {
		return false
	}

	iterations, err := strconv.Atoi(parts[1])
	if err != nil || iterations <= 0 {
		return false
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[3])
	if err != nil {
		return false
	}

	actual, err := pbkdf2.Key(sha256.New, password, salt, iterations, len(expected))
	if err != nil {
		return false
	}

	return subtle.ConstantTimeCompare(actual, expected) == 1
}
