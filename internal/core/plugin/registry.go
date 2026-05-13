package plugin

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
)

var (
	ErrDuplicatePlugin = errors.New("duplicate plugin")
	ErrPluginNotFound  = errors.New("plugin not found")
)

type RegisteredPlugin struct {
	Plugin  Plugin
	Enabled bool
}

type Registry struct {
	mu      sync.RWMutex
	plugins map[string]RegisteredPlugin
}

func NewRegistry() *Registry {
	return &Registry{plugins: map[string]RegisteredPlugin{}}
}

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

func (r *Registry) MustRegister(plugin Plugin) {
	if err := r.Register(plugin); err != nil {
		panic(err)
	}
}

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

func (r *Registry) All() []RegisteredPlugin {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.sorted(false)
}

func (r *Registry) Enabled() []RegisteredPlugin {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.sorted(true)
}

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
