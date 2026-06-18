// Package plugin defines the platform-level contract shared by built-in plugins.
// Keep this package free of HTTP, database, and frontend framework details.
package plugin

import "context"

// Permission names a server-side capability a plugin can require.
type Permission string

const (
	// PermissionBlogRead allows reading blog content and metadata.
	PermissionBlogRead Permission = "blog:read"
	// PermissionBlogWrite allows mutating blog content and metadata.
	PermissionBlogWrite Permission = "blog:write"
	// PermissionStorageRead allows reading storage object metadata.
	PermissionStorageRead Permission = "storage:read"
	// PermissionStorageWrite allows mutating storage objects and metadata.
	PermissionStorageWrite Permission = "storage:write"
	// PermissionDomainRead allows reading domain inventory and status.
	PermissionDomainRead Permission = "domain:read"
	// PermissionDomainWrite allows mutating domain provider state.
	PermissionDomainWrite Permission = "domain:write"
	// PermissionSecretRead allows reading secret metadata or decrypted values through approved services.
	PermissionSecretRead Permission = "secret:read"
	// PermissionSecretWrite allows creating or updating encrypted provider secrets.
	PermissionSecretWrite Permission = "secret:write"
	// PermissionAuditRead allows reading audit log entries.
	PermissionAuditRead Permission = "audit:read"
	// PermissionPluginManage allows enabling and disabling registered plugins.
	PermissionPluginManage Permission = "plugin:manage"
	// PermissionTaskSchedule allows scheduling background task execution.
	PermissionTaskSchedule Permission = "task:schedule"
	// PermissionUserManage allows managing users, roles, password-reset state, and sessions.
	PermissionUserManage Permission = "user:manage"
)

// NavItem describes a plugin-owned navigation entry consumed by clients.
type NavItem struct {
	Title string `json:"title"`
	Path  string `json:"path"`
	Icon  string `json:"icon"`
	Order int    `json:"order"`
}

// Widget describes a dashboard summary emitted by a plugin.
type Widget struct {
	ID          string `json:"id"`
	PluginID    string `json:"pluginId"`
	Title       string `json:"title"`
	Value       string `json:"value,omitempty"`
	Description string `json:"description,omitempty"`
	Status      string `json:"status,omitempty"`
	Href        string `json:"href,omitempty"`
}

// SettingField describes a plugin setting input without exposing stored secret values.
type SettingField struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
}

// Manifest is the serializable plugin contract shared by API and clients.
type Manifest struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Version     string         `json:"version"`
	Permissions []Permission   `json:"permissions"`
	Settings    []SettingField `json:"settings,omitempty"`
	Navigation  []NavItem      `json:"navigation,omitempty"`
}

// Dependencies carries platform services made available to plugin route registration.
type Dependencies struct{}

// Router abstracts the route target used by plugin registration.
type Router interface{}

// DB abstracts plugin migration storage without binding core contracts to database/sql.
type DB interface{}

// Plugin is the backend boundary every built-in plugin implements.
type Plugin interface {
	ID() string
	Name() string
	Version() string
	Manifest() Manifest
	RegisterRoutes(router Router, deps Dependencies)
	Migrate(ctx context.Context, db DB) error
	Dashboard(ctx context.Context, userID string) ([]Widget, error)
}

// StaticPlugin exposes manifest/widget-only plugins without route or migration side effects.
type StaticPlugin struct {
	manifest Manifest
	widgets  []Widget
}

// NewStaticPlugin creates a plugin for compile-time features that do not own backend behavior.
func NewStaticPlugin(manifest Manifest, widgets ...Widget) StaticPlugin {
	return StaticPlugin{manifest: manifest, widgets: widgets}
}

// ID returns the stable plugin identifier from the manifest.
func (p StaticPlugin) ID() string { return p.manifest.ID }

// Name returns the display name from the manifest.
func (p StaticPlugin) Name() string { return p.manifest.Name }

// Version returns the version from the manifest.
func (p StaticPlugin) Version() string { return p.manifest.Version }

// Manifest returns the serializable plugin metadata.
func (p StaticPlugin) Manifest() Manifest { return p.manifest }

// RegisterRoutes has no side effects for static plugins.
func (p StaticPlugin) RegisterRoutes(Router, Dependencies) {}

// Migrate has no side effects for static plugins.
func (p StaticPlugin) Migrate(context.Context, DB) error { return nil }

// Dashboard returns the static widgets declared at construction time.
func (p StaticPlugin) Dashboard(context.Context, string) ([]Widget, error) {
	return p.widgets, nil
}
