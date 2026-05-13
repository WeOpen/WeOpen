package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	apihttp "github.com/WeOpen/WeOpen/services/api/internal/http"
)

func main() {
	addr := os.Getenv("API_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	server := &http.Server{
		Addr:              addr,
		Handler:           apihttp.NewServer(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("weopen-api listening on %s", addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("api server failed: %v", err)
	}
}
