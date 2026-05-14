package app

import "testing"

func TestAppHealthReturnsDesktopStatus(t *testing.T) {
	t.Parallel()

	app := NewApp("0.1.0")
	health := app.Health()

	if health.Status != "ok" {
		t.Fatalf("expected status ok, got %q", health.Status)
	}

	if health.Service != "weopen-desktop" {
		t.Fatalf("expected desktop service, got %q", health.Service)
	}

	if health.Version != "0.1.0" {
		t.Fatalf("expected version 0.1.0, got %q", health.Version)
	}
}
