/**
 * Permission declares a capability a plugin may request.
 * Server-side checks remain authoritative; this type only describes intent.
 */
export type Permission =
  | "blog:read"
  | "blog:write"
  | "storage:read"
  | "storage:write"
  | "domain:read"
  | "domain:write"
  | "secret:read"
  | "secret:write"
  | "audit:read"
  | "task:schedule";

/** PluginNavItem is a serializable navigation entry contributed by a plugin manifest. */
export type PluginNavItem = {
  title: string;
  path: string;
  icon: string;
  order?: number;
};

/** PluginWidgetManifest describes a dashboard widget without executable code. */
export type PluginWidgetManifest = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  status?: "neutral" | "success" | "warning" | "danger";
};

/** PluginSettingSchema describes plugin settings while keeping stored values outside the manifest. */
export type PluginSettingSchema = {
  key: string;
  label: string;
  type: "text" | "password" | "boolean" | "number" | "select";
  required?: boolean;
  description?: string;
};

/**
 * PluginManifest is the frontend-facing contract for compile-time built-in plugins.
 * It must stay serializable because the API exposes the same shape to Web clients.
 */
export type PluginManifest = {
  id: string;
  name: string;
  description?: string;
  version: string;
  permissions: Permission[];
  nav?: PluginNavItem[];
  widgets?: PluginWidgetManifest[];
  settings?: PluginSettingSchema[];
};

/** RegisteredPlugin binds a manifest to an optional UI component and runtime enabled state. */
export type RegisteredPlugin<TComponent = unknown> = {
  manifest: PluginManifest;
  component?: TComponent;
  enabled: boolean;
};
