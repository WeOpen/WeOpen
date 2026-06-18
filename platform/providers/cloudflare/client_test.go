package cloudflare

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	domainprovider "github.com/WeOpen/WeOpen/platform/providers/domains"
)

func TestClientListsZonesAndDNSRecords(t *testing.T) {
	t.Parallel()

	var authorizedRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer cf_test_token" {
			t.Fatalf("expected bearer token header, got %q", got)
		}
		authorizedRequests++
		w.Header().Set("Content-Type", "application/json")

		switch r.URL.Path {
		case "/client/v4/zones":
			if r.URL.Query().Get("per_page") == "" {
				t.Fatal("expected zones request to set a per_page limit")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"result": []map[string]any{{
					"id":           "zone_1",
					"name":         "example.com",
					"status":       "active",
					"type":         "full",
					"name_servers": []string{"ns1.example.com", "ns2.example.com"},
				}},
				"result_info": map[string]any{"page": 1, "total_pages": 1},
			})
		case "/client/v4/zones/zone_1/dns_records":
			if r.URL.Query().Get("per_page") == "" {
				t.Fatal("expected DNS request to set a per_page limit")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true,
				"result": []map[string]any{{
					"id":       "record_1",
					"type":     "A",
					"name":     "www.example.com",
					"content":  "203.0.113.10",
					"ttl":      300,
					"proxied":  true,
					"comment":  "production website",
					"priority": 0,
				}},
				"result_info": map[string]any{"page": 1, "total_pages": 1},
			})
		default:
			t.Fatalf("unexpected Cloudflare path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client, err := NewClient(Config{BaseURL: server.URL, APIToken: "cf_test_token"})
	if err != nil {
		t.Fatalf("expected client: %v", err)
	}

	zones, err := client.ListDomains(context.Background())
	if err != nil {
		t.Fatalf("expected zones: %v", err)
	}
	if len(zones) != 1 {
		t.Fatalf("expected one zone, got %+v", zones)
	}
	if zones[0].Provider != domainprovider.ProviderCloudflare || zones[0].ProviderID != "zone_1" {
		t.Fatalf("expected Cloudflare zone identity, got %+v", zones[0])
	}
	if zones[0].Name != "example.com" || zones[0].Status != "active" || len(zones[0].NameServers) != 2 {
		t.Fatalf("expected parsed zone, got %+v", zones[0])
	}

	records, err := client.ListDNSRecords(context.Background(), zones[0])
	if err != nil {
		t.Fatalf("expected DNS records: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("expected one DNS record, got %+v", records)
	}
	if records[0].ProviderID != "record_1" || records[0].Type != "A" || records[0].Name != "www.example.com" {
		t.Fatalf("expected parsed DNS record, got %+v", records[0])
	}
	if !records[0].Proxied || records[0].TTL != 300 {
		t.Fatalf("expected DNS TTL/proxy data, got %+v", records[0])
	}
	if authorizedRequests != 2 {
		t.Fatalf("expected two authorized Cloudflare requests, got %d", authorizedRequests)
	}
}

func TestClientReturnsSafeErrorForCloudflareFailures(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": false,
			"errors":  []map[string]any{{"code": 9109, "message": "invalid token secret cf_test_token"}},
		})
	}))
	defer server.Close()

	client, err := NewClient(Config{BaseURL: server.URL, APIToken: "cf_test_token"})
	if err != nil {
		t.Fatalf("expected client: %v", err)
	}

	_, err = client.ListDomains(context.Background())
	if err == nil {
		t.Fatal("expected Cloudflare API error")
	}
	if got := err.Error(); got == "" || got == "invalid token secret cf_test_token" {
		t.Fatalf("expected redacted provider error, got %q", got)
	}
}
