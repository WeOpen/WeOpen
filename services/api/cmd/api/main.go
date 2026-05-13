package main

import (
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/WeOpen/WeOpen/services/api/internal/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/http"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}
	authStore, err := auth.NewMemoryStore(cfg.AdminEmail, cfg.AdminPassword)
	if err != nil {
		log.Fatalf("initialize auth store: %v", err)
	}

	server := &http.Server{
		Addr: cfg.Addr,
		Handler: apihttp.NewServer(apihttp.ServerOptions{
			WebOrigin: cfg.WebOrigin,
			Auth:      auth.NewService(authStore),
		}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("weopen-api listening on %s", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("api server failed: %v", err)
	}
}
