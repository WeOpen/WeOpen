// Package plugin defines the platform-level contract shared by built-in plugins.
// Keep this package free of HTTP, database, and frontend framework details.
package plugin

import "context"

type Permission string

const (
	PermissionBlogRead     Permission = "blog:read"
	PermissionBlogWrite    Permission = "blog:write"
	PermissionStorageRead  Permission = "storage:read"
	PermissionStorageWrite Permission = "storage:write"
	PermissionDomainRead   Permission = "domain:read"
	PermissionDomainWrite  Permission = "domain:write"
	PermissionSecretRead   Permission = "secret:read"
	PermissionSecretWrite  Permission = "secret:write"
	PermissionAuditRead    Permission = "audit:read"
	PermissionTaskSchedule Permission = "task:schedule"
)

type NavItem struct {
	Title string `json:"title"`
	Path  string `json:"path"`
	Icon  string `json:"icon"`
	Order int    `json:"order"`
}

type Widget struct {
	ID          string `json:"id"`
	PluginID    string `json:"pluginId"`
	Title       string `json:"title"`
	Value       string `json:"value,omitempty"`
	Description string `json:"description,omitempty"`
	Status      string `json:"status,omitempty"`
	Href        string `json:"href,omitempty"`
}

type SettingField struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
}

type Manifest struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Version     string         `json:"version"`
	Permissions []Permission   `json:"permissions"`
	Settings    []SettingField `json:"settings,omitempty"`
	Navigation  []NavItem      `json:"navigation,omitempty"`
}

type Dependencies struct{}

type Router interface{}

type DB interface{}

type Plugin interface {
	ID() string
	Name() string
	Version() string
	Manifest() Manifest
	RegisterRoutes(router Router, deps Dependencies)
	Migrate(ctx context.Context, db DB) error
	Dashboard(ctx context.Context, userID string) ([]Widget, error)
}

type StaticPlugin struct {
	manifest Manifest
	widgets  []Widget
}

func NewStaticPlugin(manifest Manifest, widgets ...Widget) StaticPlugin {
	return StaticPlugin{manifest: manifest, widgets: widgets}
}

func (p StaticPlugin) ID() string                          { return p.manifest.ID }
func (p StaticPlugin) Name() string                        { return p.manifest.Name }
func (p StaticPlugin) Version() string                     { return p.manifest.Version }
func (p StaticPlugin) Manifest() Manifest                  { return p.manifest }
func (p StaticPlugin) RegisterRoutes(Router, Dependencies) {}
func (p StaticPlugin) Migrate(context.Context, DB) error   { return nil }
func (p StaticPlugin) Dashboard(context.Context, string) ([]Widget, error) {
	return p.widgets, nil
}
