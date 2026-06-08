package domains

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	domainprovider "github.com/WeOpen/WeOpen/internal/providers/domains"
)

func TestHTTPHandlerSyncsListsAssetsAndReturnsDNSReadOnly(t *testing.T) {
	t.Parallel()

	service := NewService(
		NewMemoryRepository(),
		&fakeProvider{
			domains: []domainprovider.DomainAsset{{
				Provider:   domainprovider.ProviderCloudflare,
				ProviderID: "zone_1",
				Name:       "example.com",
				Status:     "active",
			}},
			records: map[string][]domainprovider.DNSRecord{
				"zone_1": {{ProviderID: "record_1", Type: "A", Name: "example.com", Content: "203.0.113.10", TTL: 300}},
			},
		},
		fakeCertificateChecker{status: CertificateStatus{
			Status:        CertificateStatusValid,
			ExpiresAt:     time.Now().Add(90 * 24 * time.Hour),
			DaysRemaining: 90,
			CheckedAt:     time.Now(),
		}},
		nil,
	)
	handler := NewHTTPHandler(service)

	syncRecorder := httptest.NewRecorder()
	syncRequest := httptest.NewRequest(http.MethodPost, "/sync", nil)
	syncRequest.Header.Set(ActorIDHeader, "usr_admin")
	handler.ServeHTTP(syncRecorder, syncRequest)
	if syncRecorder.Code != http.StatusCreated {
		t.Fatalf("expected sync created, got %d %s", syncRecorder.Code, syncRecorder.Body.String())
	}

	listRecorder := httptest.NewRecorder()
	handler.ServeHTTP(listRecorder, httptest.NewRequest(http.MethodGet, "/assets", nil))
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected list ok, got %d %s", listRecorder.Code, listRecorder.Body.String())
	}
	var listBody assetsResponse
	if err := json.NewDecoder(listRecorder.Body).Decode(&listBody); err != nil {
		t.Fatalf("expected list JSON: %v", err)
	}
	if len(listBody.Assets) != 1 || listBody.Assets[0].Name != "example.com" {
		t.Fatalf("expected asset response, got %+v", listBody)
	}

	dnsRecorder := httptest.NewRecorder()
	handler.ServeHTTP(dnsRecorder, httptest.NewRequest(http.MethodGet, "/assets/"+listBody.Assets[0].ID+"/dns", nil))
	if dnsRecorder.Code != http.StatusOK {
		t.Fatalf("expected DNS ok, got %d %s", dnsRecorder.Code, dnsRecorder.Body.String())
	}
	if !strings.Contains(dnsRecorder.Body.String(), "203.0.113.10") {
		t.Fatalf("expected DNS content in response, got %s", dnsRecorder.Body.String())
	}

	writeRecorder := httptest.NewRecorder()
	handler.ServeHTTP(writeRecorder, httptest.NewRequest(http.MethodPost, "/assets/"+listBody.Assets[0].ID+"/dns", nil))
	if writeRecorder.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected DNS writes disabled, got %d %s", writeRecorder.Code, writeRecorder.Body.String())
	}
}
