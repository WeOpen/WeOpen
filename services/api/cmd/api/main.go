package main

import (
	"errors"
	"log"
	"net/http"

	"github.com/WeOpen/WeOpen/services/api/internal/app"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}

	server, err := app.NewHTTPServer(cfg)
	if err != nil {
		log.Fatalf("%v", err)
	}

	log.Printf("weopen-api listening on %s", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("api server failed: %v", err)
	}
}
