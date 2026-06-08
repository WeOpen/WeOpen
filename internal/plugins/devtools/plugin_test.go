package devtools

import (
	"context"
	"testing"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
)

func TestPluginManifestKeepsDevtoolsLocalFirst(t *testing.T) {
	p := NewPlugin()

	manifest := p.Manifest()
	if manifest.ID != PluginID {
		t.Fatalf("manifest ID = %q, want %q", manifest.ID, PluginID)
	}
	if len(manifest.Permissions) != 0 {
		t.Fatalf("permissions = %v, want none for client-safe tools", manifest.Permissions)
	}
	if len(manifest.Navigation) != 1 || manifest.Navigation[0].Path != "/tools" {
		t.Fatalf("navigation = %#v, want /tools entry", manifest.Navigation)
	}

	widgets, err := p.Dashboard(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("dashboard returned error: %v", err)
	}
	if len(widgets) != 1 {
		t.Fatalf("widgets = %d, want 1", len(widgets))
	}
	if widgets[0].PluginID != PluginID {
		t.Fatalf("widget plugin ID = %q, want %q", widgets[0].PluginID, PluginID)
	}

	var _ plugin.Plugin = p
}
