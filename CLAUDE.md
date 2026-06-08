# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

WeOpen is a personal management platform built as a pnpm + Go workspace. The main surfaces are:

- `apps/web`: Next.js management UI and plugin UI container.
- `services/api`: Go HTTP API for auth, settings, audit logs, plugin metadata, and plugin routes.
- `apps/desktop`: Wails v3 desktop shell with a React/Vite frontend and small Go service bindings.
- `internal/core`: shared platform domain contracts, currently centered on the plugin contract and registry.
- `internal/plugins`: built-in backend plugin implementations.
- `internal/providers`: external provider adapters, currently including R2.
- `packages/ui`: shared React components.
- `packages/plugin-sdk`: TypeScript plugin manifest/registry types used by the web app.
- `packages/config`: shared ESLint and TypeScript config.

Development in this repository must follow `docs/development/DEVELOPMENT_STANDARDS.md`.

## Common commands

Install dependencies:

```bash
pnpm install
```

Run development servers:

```bash
pnpm dev:web        # Next.js web app, usually http://localhost:3000
pnpm dev:api        # Go API on :8080 by default
pnpm dev:desktop    # Wails v3 desktop app
```

Validate the workspace:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:go
pnpm build
```

Go tests:

```bash
go test ./services/api/...
go test ./internal/...
go test ./apps/desktop/...
go test ./internal/plugins/blog -run TestName
go test ./services/api/internal/adapters/http -run TestName
```

TypeScript plugin SDK tests:

```bash
pnpm --filter @weopen/plugin-sdk test
cd packages/plugin-sdk && node --test --experimental-strip-types src/registry.test.ts
```

Package-specific checks:

```bash
pnpm --filter @weopen/web lint
pnpm --filter @weopen/web typecheck
pnpm --filter @weopen/desktop build
pnpm --filter @weopen/plugin-sdk typecheck
```

There is currently no web app test script; web validation is lint/typecheck/build unless a test runner is added.

## Local configuration

Copy `.env.example` when local environment variables are needed. Important defaults:

- Web calls the API through `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:8080` in `.env.example`.
- API CORS uses `WEB_ORIGIN`, defaulting to `http://localhost:3000`.
- `APP_ENV=local` lets the API fill local defaults for session secret, secret encryption key, admin password, and R2 credentials.
- Local default admin credentials are `admin@example.com` / `admin` when `APP_ENV=local` and `ADMIN_PASSWORD` is unset.

## Architecture notes

### Plugin system

Backend plugin contracts live in `internal/core/plugin`. A plugin exposes a stable ID, manifest, optional dashboard widgets, route registration hook, and migration hook. The registry stores registered plugins, tracks enabled state, and returns deterministic plugin ordering by ID.

API bootstrap now lives in `services/api/internal/app`, and `services/api/cmd/api/main.go` is kept as slim startup wiring only.

API startup wires the built-in plugins:

- `blog`: full backend service and HTTP routes under `/api/plugins/blog`.
- `storage-r2`: full backend service and HTTP routes under `/api/plugins/storage-r2`.
- `devtools` and `domains`: static placeholder manifests/widgets.

The API server mounts core routes (`/healthz`, auth, settings, audit logs, `/api/plugins`) and wraps plugin route prefixes with authentication. Authenticated plugin routes receive the actor ID in the `X-WeOpen-Actor-ID` header.

Plugin enabled state has both memory and SQL store implementations in `services/api/internal/domain/pluginstate`, but `NewServer` defaults to memory when no store is supplied.

### Web plugin registration

The web app keeps a compile-time plugin boundary:

- Manifests are declared in `apps/web/src/plugins/index.ts`.
- Components are mapped in `apps/web/src/plugins/registry.tsx`.
- Shared API clients live in `apps/web/src/shared/api`.
- Shared shell layout lives in `apps/web/src/shared/layout/app-shell.tsx`.
- Blog UI lives in `apps/web/src/features/blog`.
- Storage R2 UI lives in `apps/web/src/features/storage-r2`.
- Dashboard widgets come from frontend plugin metadata in `apps/web/app/dashboard/page.tsx`.
- Dynamic plugin pages resolve components from the registry in `apps/web/app/plugins/[pluginId]/page.tsx`.

When adding a plugin with UI, keep the plugin registry files in sync and place feature-specific UI under `src/features/<feature>`.

### Current persistence boundary

The design docs describe Postgres-backed architecture, but current API startup is still mostly in-memory:

- Auth uses `services/api/internal/domain/auth` memory stores by default.
- Secrets use `services/api/internal/adapters/secrets` memory stores by default.
- Blog and storage plugins use memory repositories.
- Plugin state defaults to memory unless a SQL-backed store from `services/api/internal/domain/pluginstate` is explicitly passed.
- `services/api/internal/adapters/db` only exposes a small `database/sql` opener and is not wired into API startup yet.

Do not assume data survives API restarts unless the code path explicitly uses persistent storage.

### Desktop app

`apps/desktop` is currently a thin Wails shell. The Go service now lives in `apps/desktop/internal/app`, while `apps/desktop/main.go` intentionally stays at the module root for Wails `go:embed` compatibility. The desktop frontend home UI lives in `apps/desktop/frontend/src/features/home`, and `apps/desktop/frontend/src/shared` is reserved for future shared frontend code. Production desktop packaging still depends on building `frontend/dist` first.

## Conventions visible in the repo

- JS/TS uses pnpm workspaces from `pnpm-workspace.yaml` and package manager `pnpm@10.18.2`.
- Go modules are coordinated by `go.work` and include `services/api`, `apps/desktop`, core packages, plugins, and providers.
- Shared TypeScript config is strict and lives in `packages/config/tsconfig.base.json`.
- Shared ESLint config ignores generated/build output such as `.next`, `dist`, `build`, `node_modules`, and `wailsjs`.
- Keep project guidance aligned with `docs/development/DEVELOPMENT_STANDARDS.md` when changing workflow or validation commands.
