package http

import (
	"encoding/json"
	"net/http"
)

type healthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(healthResponse{
		Status:  "ok",
		Service: "weopen-api",
	})
}
