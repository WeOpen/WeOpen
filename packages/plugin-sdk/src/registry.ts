import type { PluginManifest, PluginNavItem, RegisteredPlugin } from "./manifest";

/** DuplicatePluginError is thrown when a registry receives the same plugin ID twice. */
export class DuplicatePluginError extends Error {
  constructor(id: string) {
    super(`Duplicate plugin id: ${id}`);
    this.name = "DuplicatePluginError";
  }
}

/** PluginNotFoundError is thrown when callers request a plugin ID that is not registered. */
export class PluginNotFoundError extends Error {
  constructor(id: string) {
    super(`Plugin not found: ${id}`);
    this.name = "PluginNotFoundError";
  }
}

/**
 * PluginRegistry keeps frontend plugin metadata deterministic.
 * It stores compile-time plugins only; remote code loading is intentionally out of scope.
 */
export class PluginRegistry<TComponent = unknown> {
  private readonly plugins = new Map<string, RegisteredPlugin<TComponent>>();

  /** register adds one plugin and rejects empty or duplicate manifest IDs. */
  register(plugin: Omit<RegisteredPlugin<TComponent>, "enabled"> & { enabled?: boolean }) {
    const id = plugin.manifest.id;
    if (!id) {
      throw new Error("Plugin id is required");
    }
    if (this.plugins.has(id)) {
      throw new DuplicatePluginError(id);
    }
    this.plugins.set(id, {
      ...plugin,
      enabled: plugin.enabled ?? true
    });
  }

  /** setEnabled changes client-side visibility state for registered plugin metadata. */
  setEnabled(id: string, enabled: boolean) {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new PluginNotFoundError(id);
    }
    this.plugins.set(id, { ...plugin, enabled });
  }

  /** all returns every registered plugin sorted by stable plugin ID. */
  all() {
    return this.sorted(Array.from(this.plugins.values()));
  }

  /** enabled returns visible plugins sorted by stable plugin ID. */
  enabled() {
    return this.sorted(Array.from(this.plugins.values()).filter((plugin) => plugin.enabled));
  }

  /** manifests returns serializable plugin metadata for navigation and management screens. */
  manifests(includeDisabled = false): PluginManifest[] {
    return (includeDisabled ? this.all() : this.enabled()).map((plugin) => plugin.manifest);
  }

  /** navigation returns enabled plugin navigation ordered by manifest order and title. */
  navigation(): PluginNavItem[] {
    return this.enabled()
      .flatMap((plugin) => plugin.manifest.nav ?? [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
  }

  /** get returns one registered plugin or throws when the ID is unknown. */
  get(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new PluginNotFoundError(id);
    }
    return plugin;
  }

  private sorted(plugins: Array<RegisteredPlugin<TComponent>>) {
    return [...plugins].sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
  }
}
