package handler

import (
	"log"
	"net/http"
	"sync"

	"github.com/WeOpen/WeOpen/services/api/internal/app"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
)

var (
	handlerOnce sync.Once
	handler     http.Handler
	handlerErr  error
)

// Handler is the Vercel Go serverless entrypoint.
func Handler(w http.ResponseWriter, r *http.Request) {
	handlerOnce.Do(func() {
		cfg, err := config.Load()
		if err != nil {
			handlerErr = err
			return
		}
		handler, handlerErr = app.NewHandler(cfg)
	})
	if handlerErr != nil {
		log.Printf("initialize weopen api handler: %v", handlerErr)
		http.Error(w, "api handler initialization failed", http.StatusInternalServerError)
		return
	}
	handler.ServeHTTP(w, r)
}
