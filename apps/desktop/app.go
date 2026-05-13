package main

type App struct {
	version string
}

type HealthInfo struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Version string `json:"version"`
}

func NewApp(version string) *App {
	return &App{version: version}
}

func (a *App) Version() string {
	return a.version
}

func (a *App) Health() HealthInfo {
	return HealthInfo{
		Status:  "ok",
		Service: "weopen-desktop",
		Version: a.version,
	}
}
