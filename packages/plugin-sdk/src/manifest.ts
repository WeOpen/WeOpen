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

export type PluginNavItem = {
  title: string;
  path: string;
  icon: string;
  order?: number;
};

export type PluginWidgetManifest = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  status?: "neutral" | "success" | "warning" | "danger";
};

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

export type RegisteredPlugin<TComponent = unknown> = {
  manifest: PluginManifest;
  component?: TComponent;
  enabled: boolean;
};
