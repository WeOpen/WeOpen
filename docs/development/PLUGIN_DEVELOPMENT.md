# Plugin Development

WeOpen v1 plugins are compile-time built-ins. The backend manifest is the runtime source of truth for management screens, permissions, enablement, and route metadata. The web registry only binds a local React component to a backend plugin ID.

## Add A Backend Plugin

1. Create or update `platform/plugins/<plugin-id>`.
2. Implement `plugin.Plugin` and return a complete `plugin.Manifest`.
3. Register the plugin in `services/api/internal/app/plugins.go`.
4. Add a `PluginRoute` entry with:
   - `Prefix`: `/api/plugins/<plugin-id>`
   - `Handler`: the plugin HTTP handler
   - `Permissions` and `PermissionRules`
   - `Catalog`: route definitions shown in `/api/plugins` and `/api/routes`
5. Add migrations under `services/api/migrations` when the plugin needs persistence.

## Add A Web UI

1. Add the feature UI under `apps/web/src/features/<feature>` or `apps/web/src/plugins/<plugin-id>`.
2. Add the frontend manifest to `apps/web/src/plugins/index.ts` with `definePluginManifest`.
3. Bind the component in `apps/web/src/plugins/registry.tsx`.

The Plugins management page does not merge mock frontend manifests into the backend list. It reads `/api/plugins` and uses the frontend registry only to report whether a UI component is bound.

## Verify

```bash
go test ./services/api/internal/adapters/http -run TestPluginHandlers
pnpm --filter @weopen/plugin-sdk test
pnpm --filter @weopen/web typecheck
```
