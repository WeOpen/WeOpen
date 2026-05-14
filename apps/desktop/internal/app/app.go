package app

// App exposes desktop-local service bindings to the Wails frontend.
type App struct {
	version string
}

// HealthInfo is the desktop health payload returned through Wails bindings.
type HealthInfo struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Version string `json:"version"`
}

// NewApp creates the desktop service with the build-time app version.
func NewApp(version string) *App {
	return &App{version: version}
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
