package app

import (
	"context"
	"os"
	"path/filepath"

	"github.com/WeOpen/WeOpen/apps/desktop/internal/settings"
)

// App exposes desktop-local service bindings to the Wails frontend.
type App struct {
	version           string
	remoteAPISettings *settings.Store
}

// HealthInfo is the desktop health payload returned through Wails bindings.
type HealthInfo struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Version string `json:"version"`
}

// NewApp creates the desktop service with the build-time app version.
func NewApp(version string) *App {
	return NewAppWithSettings(version, settings.NewStore(defaultRemoteAPISettingsPath()))
}

// NewAppWithSettings creates the desktop service with an injectable settings store for tests.
func NewAppWithSettings(version string, store *settings.Store) *App {
	if store == nil {
		store = settings.NewStore("")
	}
	return &App{
		version:           version,
		remoteAPISettings: store,
	}
}

// Version returns the desktop application version exposed to the frontend.
func (a *App) Version() string {
	return a.version
}

// Health returns a local desktop health response without external service calls.
func (a *App) Health() HealthInfo {
	return HealthInfo{
		Status:  "ok",
		Service: "weopen-desktop",
		Version: a.version,
	}
}

// LoadRemoteAPISettings returns the desktop-local remote API preferences.
func (a *App) LoadRemoteAPISettings(ctx context.Context) (settings.RemoteAPISettings, error) {
	return a.remoteAPISettings.Load(ctx)
}

// SaveRemoteAPISettings persists desktop-local remote API preferences.
func (a *App) SaveRemoteAPISettings(
	ctx context.Context,
	input settings.RemoteAPISettings,
) (settings.RemoteAPISettings, error) {
	return a.remoteAPISettings.Save(ctx, input)
}

// TestRemoteAPIConnection probes the configured remote API /healthz endpoint.
func (a *App) TestRemoteAPIConnection(
	ctx context.Context,
	input settings.RemoteAPISettings,
) (settings.ConnectionStatus, error) {
	return a.remoteAPISettings.TestConnection(ctx, input)
}

func defaultRemoteAPISettingsPath() string {
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		return filepath.Join(os.TempDir(), "WeOpen", "desktop-remote-api.json")
	}
	return filepath.Join(dir, "WeOpen", "desktop-remote-api.json")
}
