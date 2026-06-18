package plugin

import (
	"context"
	"errors"
	"testing"
)

type fakePlugin struct {
	id      string
	widgets []Widget
}

func (f fakePlugin) ID() string      { return f.id }
func (f fakePlugin) Name() string    { return f.id }
func (f fakePlugin) Version() string { return "0.1.0" }
func (f fakePlugin) Manifest() Manifest {
	return Manifest{ID: f.id, Name: f.id, Version: "0.1.0"}
}
func (f fakePlugin) RegisterRoutes(Router, Dependencies) {}
func (f fakePlugin) Migrate(context.Context, DB) error   { return nil }
func (f fakePlugin) Dashboard(context.Context, string) ([]Widget, error) {
	return f.widgets, nil
}

func TestRegistryRejectsDuplicatePluginIDs(t *testing.T) {
	t.Parallel()

	registry := NewRegistry()
	if err := registry.Register(fakePlugin{id: "blog"}); err != nil {
		t.Fatalf("expected first plugin to register: %v", err)
	}

	err := registry.Register(fakePlugin{id: "blog"})
	if !errors.Is(err, ErrDuplicatePlugin) {
		t.Fatalf("expected duplicate plugin error, got %v", err)
	}
}

func TestRegistryReturnsEnabledPluginsOnly(t *testing.T) {
	t.Parallel()

	registry := NewRegistry()
	registry.MustRegister(fakePlugin{id: "blog"})
	registry.MustRegister(fakePlugin{id: "storage-r2"})

	if err := registry.SetEnabled("blog", false); err != nil {
		t.Fatalf("expected plugin to disable: %v", err)
	}

	enabled := registry.Enabled()
	if len(enabled) != 1 {
		t.Fatalf("expected 1 enabled plugin, got %d", len(enabled))
	}
	if enabled[0].Plugin.ID() != "storage-r2" {
		t.Fatalf("expected storage plugin, got %q", enabled[0].Plugin.ID())
	}
}

func TestRegistryAggregatesDashboardWidgets(t *testing.T) {
	t.Parallel()

	registry := NewRegistry()
	registry.MustRegister(fakePlugin{
		id:      "blog",
		widgets: []Widget{{ID: "drafts", PluginID: "blog", Title: "Drafts"}},
	})

	widgets, err := registry.Dashboard(context.Background(), "usr_admin")
	if err != nil {
		t.Fatalf("expected widgets: %v", err)
	}
	if len(widgets) != 1 {
		t.Fatalf("expected 1 widget, got %d", len(widgets))
	}
	if widgets[0].PluginID != "blog" {
		t.Fatalf("expected blog widget, got %q", widgets[0].PluginID)
	}
}
