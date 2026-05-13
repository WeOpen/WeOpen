package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const appVersion = "0.1.0"

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	appService := NewApp(appVersion)

	app := application.New(application.Options{
		Name:        "WeOpen",
		Description: "Personal management platform desktop client",
		Services: []application.Service{
			application.NewService(appService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "WeOpen",
		BackgroundColour: application.NewRGB(247, 248, 251),
		URL:              "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
