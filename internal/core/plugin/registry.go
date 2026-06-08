package plugin

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
)

var (
	// ErrDuplicatePlugin is returned when two plugins share the same stable ID.
	ErrDuplicatePlugin = errors.New("duplicate plugin")
	// ErrPluginNotFound is returned when registry state is requested for an unknown plugin ID.
	ErrPluginNotFound = errors.New("plugin not found")
)

// RegisteredPlugin combines a plugin implementation with its enabled state.
type RegisteredPlugin struct {
	Plugin  Plugin
	Enabled bool
}

// Registry stores built-in plugins and keeps list operations deterministic.
type Registry struct {
	mu      sync.RWMutex
	plugins map[string]RegisteredPlugin
}

// NewRegistry creates an empty in-memory plugin registry.
func NewRegistry() *Registry {
	return &Registry{plugins: map[string]RegisteredPlugin{}}
}

// Register adds a plugin enabled by default and rejects empty or duplicate IDs.
func (r *Registry) Register(plugin Plugin) error {
	if plugin == nil {
		return errors.New("plugin is required")
	}
	id := plugin.ID()
	if id == "" {
		return errors.New("plugin id is required")
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.plugins[id]; exists {
		return fmt.Errorf("%w: %s", ErrDuplicatePlugin, id)
	}
	r.plugins[id] = RegisteredPlugin{Plugin: plugin, Enabled: true}
	return nil
}

// MustRegister registers a plugin and panics on programmer configuration errors.
func (r *Registry) MustRegister(plugin Plugin) {
	if err := r.Register(plugin); err != nil {
		panic(err)
	}
}

// SetEnabled updates runtime plugin availability without changing registration order.
func (r *Registry) SetEnabled(id string, enabled bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	registered, ok := r.plugins[id]
	if !ok {
		return fmt.Errorf("%w: %s", ErrPluginNotFound, id)
	}
	registered.Enabled = enabled
	r.plugins[id] = registered
	return nil
}

// All returns every registered plugin sorted by stable plugin ID.
func (r *Registry) All() []RegisteredPlugin {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.sorted(false)
}

// Enabled returns enabled plugins sorted by stable plugin ID.
func (r *Registry) Enabled() []RegisteredPlugin {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.sorted(true)
}

// Manifests returns serializable plugin metadata, optionally including disabled plugins.
func (r *Registry) Manifests(includeDisabled bool) []Manifest {
	registered := r.All()
	manifests := make([]Manifest, 0, len(registered))
	for _, item := range registered {
		if !includeDisabled && !item.Enabled {
			continue
		}
		manifests = append(manifests, item.Plugin.Manifest())
	}
	return manifests
}

// Dashboard aggregates widgets from enabled plugins and stops on the first plugin error.
func (r *Registry) Dashboard(ctx context.Context, userID string) ([]Widget, error) {
	registered := r.Enabled()
	var widgets []Widget
	for _, item := range registered {
		pluginWidgets, err := item.Plugin.Dashboard(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("plugin %s dashboard: %w", item.Plugin.ID(), err)
		}
		widgets = append(widgets, pluginWidgets...)
	}
	return widgets, nil
}

func (r *Registry) sorted(enabledOnly bool) []RegisteredPlugin {
	result := make([]RegisteredPlugin, 0, len(r.plugins))
	for _, registered := range r.plugins {
		if enabledOnly && !registered.Enabled {
			continue
		}
		result = append(result, registered)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Plugin.ID() < result[j].Plugin.ID()
	})
	return result
}
