# WeOpen Personal Platform Implementation Plan

> **For Claude/Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build a low-cost, plugin-based personal management platform with Next.js Web, Go API, Wails v3 desktop, Cloudflare R2 storage, and extensible built-in plugins.

**Architecture:** Use a monorepo with separate deployable apps for Web, API, and Desktop. Keep platform core in shared Go packages and plugin contracts in both Go and TypeScript. Start with compile-time built-in plugins instead of dynamic remote plugin loading.

**Tech Stack:** Next.js, React, TypeScript, Go, Wails v3, PostgreSQL-compatible database, Cloudflare R2, OpenAPI, pnpm workspace, Go workspace.

---

## 0. Plan Context

### Source Documents

- Product requirements: `docs/PRD-personal-management-platform.md`
- Technical design: `docs/DESIGN-personal-management-platform.md`

### Primary Constraints

- No self-owned server in v1.
- Web deploys to Vercel.
- Go API must be compatible with serverless request lifecycle.
- Desktop uses Wails v3 and should reuse UI/API/client code where practical.
- R2 is object storage only, not the source of relational truth.
- v1 is single-user or invite-only; no public SaaS, no multi-tenant, no plugin marketplace.
- Plugins are compile-time built-ins for v1.
- No new dependencies without a concrete need and an explicit decision in the task notes.

### Definition of Done for v1

- Local development can start Web and API with documented commands.
- Web app has login, dashboard, settings, plugin registry UI, and the four core plugins.
- API exposes auth, settings, plugin, audit, blog, devtools, domains, and storage endpoints.
- R2 upload flow uses presigned URLs or a similarly serverless-safe path.
- Domain plugin supports Cloudflare/manual read-only management in v1.
- Desktop app opens, connects to remote API, and provides local developer tools.
- Basic tests, typecheck, lint, and builds pass.
- Deployment documentation exists for Vercel Web/API and required environment variables.

---

## 1. Development Principles

### Implementation Rules

- Build in thin vertical slices.
- Keep platform core small; move feature-specific code into plugins.
- Prefer compile-time registration over runtime code loading.
- Use OpenAPI as the API contract between Go and TypeScript.
- Write tests before or alongside implementation for behavior that can regress.
- Commit after each stable task group using the Lore Commit Protocol from `AGENTS.md`.

### Commit Message Template

Use this shape for meaningful commits:

```text
Enable plugin-based platform bootstrap

The platform needs a stable skeleton before feature plugins can be
implemented, so this commit adds the workspace layout, app shells,
shared contracts, and health checks.

Constraint: v1 must run without a self-owned server
Rejected: Dynamic plugin loading | unsafe and unnecessary for v1
Confidence: high
Scope-risk: moderate
Tested: pnpm lint; pnpm typecheck; go test ./...
Not-tested: Production Vercel deployment
```

### Verification Levels

- Small change: run targeted unit test or typecheck.
- App-level change: run affected app lint/typecheck/test/build.
- Cross-cutting change: run full verification matrix.
- Deployment change: run local build plus document manual deploy check.

---

## 2. Target Repository Layout

Create this layout incrementally:

```text
.
  apps/
    web/
    desktop/
  services/
    api/
  packages/
    ui/
    sdk/
    plugin-sdk/
    config/
  internal/
    core/
    providers/
    plugins/
  db/
    migrations/
    seed/
  docs/
  scripts/
  PLAN.md
  pnpm-workspace.yaml
  package.json
  go.work
```

---

## 3. Milestone Overview

| Milestone | Name | Outcome |
| --- | --- | --- |
| M0 | Workspace foundation | Monorepo, Web shell, Go API shell, desktop shell, common scripts |
| M1 | Platform core | Auth, settings, secrets, audit, plugin registry |
| M2 | Plugin framework | Backend/frontend plugin contracts, registry, nav, dashboard widgets |
| M3 | Blog plugin | Article CRUD, Markdown editing, taxonomy, publish status |
| M4 | R2 storage plugin | Bucket config, object list, upload URL, download/delete |
| M5 | Devtools plugin | Local/browser-safe developer tools |
| M6 | Domains plugin | Domain assets, Cloudflare read sync, DNS/SSL status |
| M7 | Desktop app | Wails shell, remote API mode, local tools |
| M8 | Deployment and hardening | Vercel docs, env templates, CI, E2E, security review |

---

## 4. Milestone M0: Workspace Foundation

### Task M0.1: Initialize Node Workspace

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.base.json`
- Create: `packages/config/eslint.base.js`
- Create: `.env.example`
- Modify: `.gitignore`

**Steps:**

1. Create root package metadata with scripts:
   - `dev:web`
   - `dev:api`
   - `dev:desktop`
   - `lint`
   - `typecheck`
   - `test`
   - `build`
2. Add pnpm workspace globs:
   - `apps/*`
   - `packages/*`
3. Add shared TypeScript config.
4. Add env example with Web/API/R2/database variables.
5. Run:

```bash
pnpm install
pnpm lint
pnpm typecheck
```

**Expected:** Install succeeds; lint/typecheck may be no-op before apps exist.

**Commit:** `Create workspace foundation`

### Task M0.2: Initialize Go Workspace

**Files:**

- Create: `go.work`
- Create: `services/api/go.mod`
- Create: `services/api/cmd/api/main.go`
- Create: `services/api/internal/http/server.go`
- Create: `services/api/internal/http/health.go`
- Create: `services/api/internal/http/health_test.go`

**Steps:**

1. Create a minimal Go module for API.
2. Implement `GET /healthz`.
3. Return JSON:

```json
{
  "status": "ok",
  "service": "weopen-api"
}
```

4. Write a handler test for `/healthz`.
5. Run:

```bash
go test ./...
go run ./services/api/cmd/api
```

**Expected:** Tests pass; local API serves `/healthz`.

**Commit:** `Make the API bootable before platform work`

### Task M0.3: Initialize Next.js Web App

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/dashboard/page.tsx`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/components/app-shell.tsx`

**Steps:**

1. Scaffold a minimal Next.js App Router application.
2. Build a quiet admin shell with sidebar and topbar.
3. Add dashboard placeholder cards for Blog, Tools, Domains, Storage.
4. Add an API health check helper.
5. Run:

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

**Expected:** Web app builds and renders dashboard placeholder.

**Commit:** `Add the web application shell`

### Task M0.4: Initialize Shared UI Package

**Files:**

- Create: `packages/ui/package.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/button.tsx`
- Create: `packages/ui/src/card.tsx`
- Create: `packages/ui/src/input.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`

**Steps:**

1. Add minimal shared components.
2. Export components from `packages/ui`.
3. Replace local Web buttons/cards with shared UI components.
4. Run:

```bash
pnpm --filter ui typecheck
pnpm --filter web typecheck
```

**Expected:** Web consumes shared UI package successfully.

**Commit:** `Share the first UI primitives`

### Task M0.5: Initialize Wails Desktop Shell

**Files:**

- Create: `apps/desktop/go.mod`
- Create: `apps/desktop/main.go`
- Create: `apps/desktop/app.go`
- Create: `apps/desktop/frontend/package.json`
- Create: `apps/desktop/frontend/src/App.tsx`
- Create: `apps/desktop/frontend/src/main.tsx`
- Create: `apps/desktop/wails.json`

**Steps:**

1. Create Wails v3 app skeleton.
2. Add minimal desktop home screen.
3. Add a Go binding for app version or health info.
4. Run:

```bash
go test ./...
pnpm --dir apps/desktop/frontend typecheck
```

**Expected:** Desktop frontend typechecks; Go bindings compile.

**Commit:** `Add the desktop application shell`

---

## 5. Milestone M1: Platform Core

### Task M1.1: Add Configuration Loader

**Files:**

- Create: `services/api/internal/config/config.go`
- Create: `services/api/internal/config/config_test.go`
- Modify: `services/api/cmd/api/main.go`
- Modify: `.env.example`

**Steps:**

1. Define config fields:
   - `APP_ENV`
   - `APP_URL`
   - `WEB_ORIGIN`
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `SECRET_ENCRYPTION_KEY`
2. Validate required env vars outside local/dev defaults.
3. Add tests for missing required values.
4. Run:

```bash
go test ./services/api/internal/config ./services/api/cmd/api
```

**Expected:** Config validation behaves predictably.

**Commit:** `Fail fast on invalid API configuration`

### Task M1.2: Add Database Layer and Migrations

**Files:**

- Create: `db/migrations/000001_core.up.sql`
- Create: `db/migrations/000001_core.down.sql`
- Create: `services/api/internal/db/db.go`
- Create: `services/api/internal/db/migrate.go`
- Create: `services/api/internal/db/db_test.go`
- Modify: `services/api/cmd/api/main.go`

**Steps:**

1. Add core tables:
   - `users`
   - `sessions`
   - `plugins`
   - `plugin_settings`
   - `secrets`
   - `audit_logs`
   - `notifications`
2. Add migration runner.
3. Add test that migration SQL can be parsed/applied in the chosen test database strategy.
4. Run:

```bash
go test ./services/api/internal/db
```

**Expected:** Migrations apply cleanly in test environment.

**Commit:** `Create the core database schema`

### Task M1.3: Implement Error and Request Middleware

**Files:**

- Create: `services/api/internal/http/errors.go`
- Create: `services/api/internal/http/middleware.go`
- Create: `services/api/internal/http/errors_test.go`
- Modify: `services/api/internal/http/server.go`

**Steps:**

1. Add request ID middleware.
2. Add JSON error response format.
3. Add panic recovery.
4. Add CORS based on `WEB_ORIGIN`.
5. Test error response shape.
6. Run:

```bash
go test ./services/api/internal/http
```

**Expected:** All API errors return a stable JSON shape.

**Commit:** `Standardize API request and error handling`

### Task M1.4: Implement Single-User Auth

**Files:**

- Create: `services/api/internal/auth/service.go`
- Create: `services/api/internal/auth/password.go`
- Create: `services/api/internal/auth/session.go`
- Create: `services/api/internal/auth/service_test.go`
- Create: `services/api/internal/http/auth_handlers.go`
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/src/lib/auth.ts`
- Modify: `services/api/internal/http/server.go`
- Modify: `db/migrations/000001_core.up.sql`

**Steps:**

1. Add password hashing and verification.
2. Add session creation and expiration.
3. Add `POST /api/auth/login`.
4. Add `POST /api/auth/logout`.
5. Add `GET /api/me`.
6. Add Web login page.
7. Add authenticated dashboard guard.
8. Run:

```bash
go test ./services/api/internal/auth ./services/api/internal/http
pnpm --filter web typecheck
pnpm --filter web build
```

**Expected:** Login returns session; dashboard can load current user.

**Commit:** `Protect the platform with single-user auth`

### Task M1.5: Implement Settings, Secrets, and Audit Logs

**Files:**

- Create: `services/api/internal/secrets/crypto.go`
- Create: `services/api/internal/secrets/service.go`
- Create: `services/api/internal/secrets/service_test.go`
- Create: `services/api/internal/audit/service.go`
- Create: `services/api/internal/audit/service_test.go`
- Create: `services/api/internal/http/settings_handlers.go`
- Create: `apps/web/app/settings/page.tsx`
- Create: `apps/web/src/features/settings/settings-form.tsx`

**Steps:**

1. Implement encryption/decryption for secrets using `SECRET_ENCRYPTION_KEY`.
2. Store only encrypted value and `last4`.
3. Add settings API.
4. Add audit log write API internally.
5. Add settings UI for R2 and Cloudflare token placeholders.
6. Run:

```bash
go test ./services/api/internal/secrets ./services/api/internal/audit ./services/api/internal/http
pnpm --filter web typecheck
```

**Expected:** Secrets are never returned raw; settings changes produce audit logs.

**Commit:** `Store external service settings safely`

---

## 6. Milestone M2: Plugin Framework

### Task M2.1: Define Go Plugin Contracts

**Files:**

- Create: `internal/core/plugin/plugin.go`
- Create: `internal/core/plugin/registry.go`
- Create: `internal/core/plugin/registry_test.go`
- Modify: `go.work`

**Steps:**

1. Define `Plugin`, `Manifest`, `Permission`, `NavItem`, `Widget`.
2. Implement registry with duplicate ID protection.
3. Add tests for registration, duplicate rejection, and enabled lookup.
4. Run:

```bash
go test ./internal/core/plugin
```

**Expected:** Plugin registry is deterministic and rejects duplicate plugin IDs.

**Commit:** `Define the backend plugin contract`

### Task M2.2: Define TypeScript Plugin SDK

**Files:**

- Create: `packages/plugin-sdk/package.json`
- Create: `packages/plugin-sdk/src/index.ts`
- Create: `packages/plugin-sdk/src/manifest.ts`
- Create: `packages/plugin-sdk/src/registry.ts`
- Create: `packages/plugin-sdk/src/registry.test.ts`

**Steps:**

1. Define TypeScript plugin manifest types.
2. Implement frontend plugin registry.
3. Test duplicate ID rejection and nav sorting.
4. Run:

```bash
pnpm --filter plugin-sdk test
pnpm --filter plugin-sdk typecheck
```

**Expected:** Frontend plugin contracts compile and tests pass.

**Commit:** `Define the frontend plugin contract`

### Task M2.3: Expose Plugin Manifest API

**Files:**

- Create: `services/api/internal/http/plugin_handlers.go`
- Create: `services/api/internal/http/plugin_handlers_test.go`
- Modify: `services/api/internal/http/server.go`
- Modify: `internal/core/plugin/registry.go`

**Steps:**

1. Add `GET /api/plugins`.
2. Add `PATCH /api/plugins/{id}` for enable/disable.
3. Respect database `plugins.enabled`.
4. Return manifest, permissions, nav, and version.
5. Run:

```bash
go test ./services/api/internal/http ./internal/core/plugin
```

**Expected:** Web can fetch enabled and disabled plugin metadata.

**Commit:** `Serve plugin manifests from the API`

### Task M2.4: Add Web Plugin Shell

**Files:**

- Create: `apps/web/src/plugins/index.ts`
- Create: `apps/web/src/plugins/registry.tsx`
- Create: `apps/web/app/plugins/page.tsx`
- Create: `apps/web/app/plugins/[pluginId]/page.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Modify: `apps/web/app/dashboard/page.tsx`

**Steps:**

1. Add frontend registry for built-in plugins.
2. Render plugin navigation in sidebar.
3. Render plugin list page.
4. Render dashboard widgets from plugin registry.
5. Run:

```bash
pnpm --filter web typecheck
pnpm --filter web build
```

**Expected:** Plugin UI can render placeholder plugins.

**Commit:** `Render plugin navigation and dashboard widgets`

---

## 7. Milestone M3: Blog Plugin

### Task M3.1: Add Blog Database Schema

**Files:**

- Create: `db/migrations/000002_blog.up.sql`
- Create: `db/migrations/000002_blog.down.sql`
- Create: `internal/plugins/blog/migrate.go`
- Create: `internal/plugins/blog/repository.go`
- Create: `internal/plugins/blog/repository_test.go`

**Steps:**

1. Add `blog_posts`, `blog_terms`, `blog_post_terms`.
2. Add repository methods for create/list/get/update/delete.
3. Test slug uniqueness and status transitions.
4. Run:

```bash
go test ./internal/plugins/blog
```

**Expected:** Blog repository supports draft CRUD.

**Commit:** `Create the blog plugin data model`

### Task M3.2: Add Blog API

**Files:**

- Create: `internal/plugins/blog/plugin.go`
- Create: `internal/plugins/blog/service.go`
- Create: `internal/plugins/blog/service_test.go`
- Create: `internal/plugins/blog/http.go`
- Create: `internal/plugins/blog/http_test.go`
- Modify: `services/api/cmd/api/main.go`

**Steps:**

1. Register blog plugin.
2. Add routes under `/api/plugins/blog`.
3. Implement:
   - `GET /posts`
   - `POST /posts`
   - `GET /posts/{id}`
   - `PATCH /posts/{id}`
   - `DELETE /posts/{id}`
4. Record audit logs for create/update/delete.
5. Run:

```bash
go test ./internal/plugins/blog ./services/api/internal/http
```

**Expected:** Blog plugin API supports article management.

**Commit:** `Expose blog post management through plugin API`

### Task M3.3: Add Blog Web UI

**Files:**

- Create: `apps/web/src/plugins/blog/index.tsx`
- Create: `apps/web/src/plugins/blog/posts-page.tsx`
- Create: `apps/web/src/plugins/blog/post-editor.tsx`
- Create: `apps/web/src/plugins/blog/post-preview.tsx`
- Create: `apps/web/app/blog/page.tsx`
- Create: `apps/web/app/blog/posts/[id]/page.tsx`
- Modify: `apps/web/src/plugins/index.ts`

**Steps:**

1. Add article list.
2. Add Markdown editor.
3. Add preview pane.
4. Add status selector: draft, published, archived.
5. Add taxonomy controls.
6. Run:

```bash
pnpm --filter web typecheck
pnpm --filter web build
```

**Expected:** User can create, edit, preview, and publish article records.

**Commit:** `Add the blog management interface`

---

## 8. Milestone M4: R2 Storage Plugin

### Task M4.1: Add R2 Provider

**Files:**

- Create: `internal/providers/r2/client.go`
- Create: `internal/providers/r2/client_test.go`
- Create: `internal/providers/r2/presign.go`
- Create: `internal/providers/r2/types.go`

**Steps:**

1. Implement client construction from settings/secrets.
2. Implement object listing.
3. Implement presigned upload URL.
4. Implement presigned download URL.
5. Mock external calls in tests.
6. Run:

```bash
go test ./internal/providers/r2
```

**Expected:** R2 provider can be tested without real credentials.

**Commit:** `Wrap R2 access behind a provider`

### Task M4.2: Add Storage Schema and API

**Files:**

- Create: `db/migrations/000003_storage.up.sql`
- Create: `db/migrations/000003_storage.down.sql`
- Create: `internal/plugins/storage_r2/plugin.go`
- Create: `internal/plugins/storage_r2/repository.go`
- Create: `internal/plugins/storage_r2/service.go`
- Create: `internal/plugins/storage_r2/http.go`
- Create: `internal/plugins/storage_r2/service_test.go`

**Steps:**

1. Add `storage_objects` table.
2. Add `GET /api/plugins/storage-r2/objects`.
3. Add `POST /api/plugins/storage-r2/upload-url`.
4. Add `POST /api/plugins/storage-r2/objects/complete`.
5. Add `DELETE /api/plugins/storage-r2/objects/{id}`.
6. Record audit logs for delete and visibility changes.
7. Run:

```bash
go test ./internal/plugins/storage_r2 ./internal/providers/r2
```

**Expected:** Storage plugin can index R2 objects and create upload URLs.

**Commit:** `Add serverless-safe R2 storage APIs`

### Task M4.3: Add Storage Web UI

**Files:**

- Create: `apps/web/src/plugins/storage-r2/index.tsx`
- Create: `apps/web/src/plugins/storage-r2/storage-page.tsx`
- Create: `apps/web/src/plugins/storage-r2/upload-panel.tsx`
- Create: `apps/web/src/plugins/storage-r2/object-table.tsx`
- Create: `apps/web/app/storage/page.tsx`
- Modify: `apps/web/src/plugins/index.ts`

**Steps:**

1. Add object list table.
2. Add drag/drop upload.
3. Use presigned URL flow.
4. Add delete confirmation.
5. Add public/private visibility indicator.
6. Run:

```bash
pnpm --filter web typecheck
pnpm --filter web build
```

**Expected:** User can upload, list, download, and delete indexed R2 objects.

**Commit:** `Add the R2 storage management interface`

### Task M4.4: Connect Blog Media to Storage

**Files:**

- Modify: `apps/web/src/plugins/blog/post-editor.tsx`
- Modify: `apps/web/src/plugins/storage-r2/upload-panel.tsx`
- Modify: `internal/plugins/blog/service.go`
- Modify: `internal/plugins/blog/http.go`

**Steps:**

1. Allow blog editor to select/upload cover image.
2. Store `cover_object_key` on blog post.
3. Show cover preview.
4. Validate object ownership/index before saving.
5. Run:

```bash
go test ./internal/plugins/blog ./internal/plugins/storage_r2
pnpm --filter web typecheck
pnpm --filter web build
```

**Expected:** Blog and R2 form a working content-media loop.

**Commit:** `Let blog posts use R2 media assets`

---

## 9. Milestone M5: Developer Tools Plugin

### Task M5.1: Define Tool Runtime Boundaries

**Files:**

- Create: `apps/web/src/plugins/devtools/tools.ts`
- Create: `apps/web/src/plugins/devtools/types.ts`
- Create: `apps/web/src/plugins/devtools/tools.test.ts`
- Create: `internal/plugins/devtools/plugin.go`

**Steps:**

1. Mark each tool as `client`, `server`, or `desktop`.
2. Start with client-safe tools:
   - JSON format/compress.
   - Base64 encode/decode.
   - URL encode/decode.
   - Timestamp conversion.
   - UUID generation.
3. Add tests for pure functions.
4. Run:

```bash
pnpm --filter web test
pnpm --filter web typecheck
go test ./internal/plugins/devtools
```

**Expected:** Sensitive devtools do not require server round-trips.

**Commit:** `Define local-first developer tools`

### Task M5.2: Add Devtools Web UI

**Files:**

- Create: `apps/web/src/plugins/devtools/index.tsx`
- Create: `apps/web/src/plugins/devtools/tools-page.tsx`
- Create: `apps/web/src/plugins/devtools/json-tool.tsx`
- Create: `apps/web/src/plugins/devtools/encoding-tool.tsx`
- Create: `apps/web/src/plugins/devtools/time-tool.tsx`
- Create: `apps/web/src/plugins/devtools/uuid-tool.tsx`
- Create: `apps/web/app/tools/page.tsx`
- Modify: `apps/web/src/plugins/index.ts`

**Steps:**

1. Add tabbed tool layout.
2. Add input/output panels.
3. Add copy buttons and error states.
4. Ensure invalid JSON shows readable error.
5. Run:

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web build
```

**Expected:** Tool UI works without backend for client-safe tools.

**Commit:** `Add the programmer tools workspace`

### Task M5.3: Add Advanced Tools

**Files:**

- Create: `apps/web/src/plugins/devtools/jwt-tool.tsx`
- Create: `apps/web/src/plugins/devtools/hash-tool.tsx`
- Create: `apps/web/src/plugins/devtools/regex-tool.tsx`
- Create: `apps/web/src/plugins/devtools/cron-tool.tsx`
- Modify: `apps/web/src/plugins/devtools/tools.ts`

**Steps:**

1. Add JWT decode without verification.
2. Add hash/HMAC tool if Web Crypto support is enough.
3. Add regex tester.
4. Add Cron parser if a dependency is approved; otherwise defer to P2.
5. Run:

```bash
pnpm --filter web test
pnpm --filter web typecheck
```

**Expected:** At least 10 developer tools are available or explicitly deferred.

**Commit:** `Expand the built-in developer tools`

---

## 10. Milestone M6: Domains Plugin

### Task M6.1: Add Domain Provider Abstraction

**Files:**

- Create: `internal/providers/domains/provider.go`
- Create: `internal/providers/cloudflare/client.go`
- Create: `internal/providers/cloudflare/domains.go`
- Create: `internal/providers/cloudflare/dns.go`
- Create: `internal/providers/cloudflare/client_test.go`

**Steps:**

1. Define `DomainProvider`.
2. Implement Cloudflare list zones/domains.
3. Implement DNS record list.
4. Mock Cloudflare HTTP responses.
5. Run:

```bash
go test ./internal/providers/domains ./internal/providers/cloudflare
```

**Expected:** Domain provider can read Cloudflare assets with mocked tests.

**Commit:** `Abstract domain inventory providers`

### Task M6.2: Add Domains Schema and API

**Files:**

- Create: `db/migrations/000004_domains.up.sql`
- Create: `db/migrations/000004_domains.down.sql`
- Create: `internal/plugins/domains/plugin.go`
- Create: `internal/plugins/domains/repository.go`
- Create: `internal/plugins/domains/service.go`
- Create: `internal/plugins/domains/http.go`
- Create: `internal/plugins/domains/service_test.go`

**Steps:**

1. Add `domain_assets`.
2. Add `dns_record_snapshots`.
3. Add `GET /api/plugins/domains/assets`.
4. Add `POST /api/plugins/domains/sync`.
5. Add `GET /api/plugins/domains/assets/{id}/dns`.
6. Keep DNS write operations disabled in v1.
7. Run:

```bash
go test ./internal/plugins/domains ./internal/providers/cloudflare
```

**Expected:** Domain plugin can sync and display read-only domain/DNS data.

**Commit:** `Add read-only domain inventory APIs`

### Task M6.3: Add SSL and Expiry Checks

**Files:**

- Create: `internal/plugins/domains/certcheck.go`
- Create: `internal/plugins/domains/certcheck_test.go`
- Modify: `internal/plugins/domains/service.go`
- Modify: `internal/plugins/domains/http.go`

**Steps:**

1. Implement TLS certificate check for domain.
2. Store or return certificate expiry status.
3. Add warning thresholds:
   - expired
   - under 7 days
   - under 30 days
4. Run:

```bash
go test ./internal/plugins/domains
```

**Expected:** Domain plugin can surface certificate risk.

**Commit:** `Warn about domain certificate expiry`

### Task M6.4: Add Domains Web UI

**Files:**

- Create: `apps/web/src/plugins/domains/index.tsx`
- Create: `apps/web/src/plugins/domains/domains-page.tsx`
- Create: `apps/web/src/plugins/domains/domain-detail.tsx`
- Create: `apps/web/src/plugins/domains/dns-record-table.tsx`
- Create: `apps/web/app/domains/page.tsx`
- Modify: `apps/web/src/plugins/index.ts`

**Steps:**

1. Add domain list.
2. Add sync button.
3. Add DNS records table.
4. Add expiry and certificate warning badges.
5. Add clear messaging that v1 DNS writes are disabled.
6. Run:

```bash
pnpm --filter web typecheck
pnpm --filter web build
```

**Expected:** User can inspect Cloudflare/manual domains and DNS state.

**Commit:** `Add the domain management interface`

---

## 11. Milestone M7: Desktop App

### Task M7.1: Add Desktop Remote API Settings

**Files:**

- Modify: `apps/desktop/app.go`
- Create: `apps/desktop/internal/settings/settings.go`
- Create: `apps/desktop/internal/settings/settings_test.go`
- Create: `apps/desktop/frontend/src/features/settings/RemoteApiSettings.tsx`
- Modify: `apps/desktop/frontend/src/App.tsx`

**Steps:**

1. Add local preference storage for API base URL.
2. Add token/session storage strategy.
3. Add UI for remote API configuration.
4. Add connection test to `/healthz`.
5. Run:

```bash
go test ./apps/desktop/...
pnpm --dir apps/desktop/frontend typecheck
```

**Expected:** Desktop app can store and test remote API settings.

**Commit:** `Let desktop connect to the remote API`

### Task M7.2: Reuse Devtools in Desktop

**Files:**

- Modify: `apps/desktop/frontend/src/App.tsx`
- Create: `apps/desktop/frontend/src/features/devtools/DesktopTools.tsx`
- Modify: `apps/web/src/plugins/devtools/tools.ts`
- Modify: `packages/ui/src/index.ts`

**Steps:**

1. Move shared tool functions into a package or shared module.
2. Render local tools in Wails frontend.
3. Add desktop-specific file helpers only if needed.
4. Run:

```bash
pnpm --filter web test
pnpm --dir apps/desktop/frontend typecheck
go test ./apps/desktop/...
```

**Expected:** Desktop has useful local tools without depending on Web routes.

**Commit:** `Reuse developer tools in the desktop app`

### Task M7.3: Add Desktop Dashboard

**Files:**

- Create: `apps/desktop/frontend/src/features/dashboard/DesktopDashboard.tsx`
- Create: `apps/desktop/frontend/src/lib/apiClient.ts`
- Modify: `apps/desktop/frontend/src/App.tsx`
- Modify: `packages/sdk/src/client.ts`

**Steps:**

1. Use generated SDK or shared API client.
2. Display remote Dashboard summary if configured.
3. Show graceful empty state if remote API is missing.
4. Run:

```bash
pnpm --dir apps/desktop/frontend typecheck
go test ./apps/desktop/...
```

**Expected:** Desktop can show remote platform status and local tools.

**Commit:** `Show platform status in desktop`

---

## 12. Milestone M8: Deployment, CI, and Hardening

### Task M8.1: Add OpenAPI and SDK Generation

**Files:**

- Create: `services/api/openapi.yaml`
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/src/client.ts`
- Create: `scripts/generate-sdk.sh`
- Modify: `package.json`

**Steps:**

1. Document auth, plugins, blog, storage, domains APIs.
2. Add SDK generation command.
3. Replace ad hoc fetch helpers with SDK where practical.
4. Run:

```bash
pnpm generate:sdk
pnpm --filter sdk typecheck
pnpm --filter web typecheck
```

**Expected:** Frontend API calls are based on stable contracts.

**Commit:** `Publish the API contract for frontend clients`

### Task M8.2: Add CI

**Files:**

- Create: `.github/workflows/ci.yml`
- Modify: `package.json`

**Steps:**

1. Add jobs:
   - install
   - lint
   - typecheck
   - test Go
   - test Web
   - build Web
2. Cache pnpm and Go modules.
3. Run commands locally before pushing:

```bash
pnpm lint
pnpm typecheck
pnpm test
go test ./...
pnpm build
```

**Expected:** CI matches local verification.

**Commit:** `Verify the platform in CI`

### Task M8.3: Add Vercel Deployment Documentation

**Files:**

- Create: `docs/deployment/vercel-web.md`
- Create: `docs/deployment/vercel-api.md`
- Create: `docs/deployment/r2.md`
- Create: `docs/deployment/database.md`
- Modify: `README.md`
- Modify: `.env.example`

**Steps:**

1. Document two-project deployment:
   - `apps/web`
   - `services/api`
2. Document env vars.
3. Document R2 bucket, access key, and public URL setup.
4. Document database setup.
5. Add troubleshooting section.

**Expected:** A new developer can deploy v1 without guessing required env vars.

**Commit:** `Document the free-tier deployment path`

### Task M8.4: Add End-to-End Smoke Tests

**Files:**

- Create: `apps/web/e2e/auth-dashboard.spec.ts`
- Create: `apps/web/e2e/blog-storage.spec.ts`
- Create: `apps/web/e2e/domains.spec.ts`
- Create: `apps/web/playwright.config.ts`
- Modify: `apps/web/package.json`

**Steps:**

1. Add login/dashboard smoke test.
2. Add blog draft creation smoke test.
3. Add storage upload flow with mocked R2 or test mode.
4. Add domains read-only screen smoke test.
5. Run:

```bash
pnpm --filter web e2e
```

**Expected:** Critical flows can be checked before release.

**Commit:** `Cover core user flows with smoke tests`

### Task M8.5: Security Review and Hardening

**Files:**

- Modify: `services/api/internal/http/middleware.go`
- Modify: `services/api/internal/secrets/service.go`
- Modify: `internal/plugins/storage_r2/http.go`
- Modify: `internal/plugins/domains/http.go`
- Create: `docs/security/v1-security-checklist.md`

**Steps:**

1. Verify no raw secrets are returned.
2. Verify logs do not include secret values.
3. Verify CORS only allows configured origin.
4. Verify file upload size/type validation.
5. Verify DNS writes are disabled unless explicitly implemented.
6. Verify destructive operations require confirmation.
7. Run:

```bash
go test ./...
pnpm lint
pnpm typecheck
```

**Expected:** v1 security checklist is documented and enforced where possible.

**Commit:** `Harden v1 secret and plugin boundaries`

---

## 13. Cross-Cutting Implementation Details

### 13.1 API Error Codes

Use stable error codes:

```text
AUTH_INVALID_CREDENTIALS
AUTH_SESSION_EXPIRED
CONFIG_MISSING
PLUGIN_DISABLED
PLUGIN_NOT_FOUND
SECRET_NOT_FOUND
R2_CONFIG_INVALID
R2_UPLOAD_FAILED
DOMAIN_TOKEN_INVALID
DOMAIN_SYNC_FAILED
VALIDATION_FAILED
INTERNAL_ERROR
```

### 13.2 Plugin Permission Names

Initial permission names:

```text
blog:read
blog:write
storage:read
storage:write
domain:read
domain:write
secret:read
secret:write
audit:read
task:schedule
```

### 13.3 Dashboard Widget Contract

Each plugin may expose:

```ts
type DashboardWidget = {
  id: string
  pluginId: string
  title: string
  value?: string
  description?: string
  status?: "neutral" | "success" | "warning" | "danger"
  href?: string
}
```

### 13.4 High-Risk Operations

Require explicit confirmation for:

- Delete object.
- Delete post.
- Replace secret.
- Export all data.
- Any future DNS write.

### 13.5 Secret Handling Rules

- Store encrypted value only.
- Return `last4`, provider, name, created time, updated time.
- Never log raw token.
- Never put secrets in `NEXT_PUBLIC_*`.
- Prefer provider-specific tokens with minimal permissions.

---

## 14. Local Development Commands

Expected commands after scaffold:

```bash
pnpm install
pnpm dev:web
pnpm dev:api
pnpm dev:desktop
pnpm lint
pnpm typecheck
pnpm test
pnpm build
go test ./...
```

Expected local URLs:

```text
Web: http://localhost:3000
API: http://localhost:8080
API health: http://localhost:8080/healthz
```

---

## 15. Release Gates

### Alpha Gate

- M0, M1, M2 complete.
- Login and dashboard work.
- Plugin registry works with placeholders.
- Local Web/API startup documented.

### Private v1 Gate

- M3, M4, M5, M6 complete.
- Blog + R2 loop works.
- Devtools has at least 10 tools or documented deferrals.
- Domains are read-only and safe.
- Basic CI is green.

### Desktop Preview Gate

- M7 complete.
- Desktop opens and runs local tools.
- Remote API setting works.
- Desktop does not block Web/API release.

### Deployable v1 Gate

- M8 complete.
- Vercel Web/API deployment docs complete.
- R2 and database setup docs complete.
- E2E smoke tests pass.
- Security checklist complete.

---

## 16. Risk Register

| Risk | Trigger | Mitigation |
| --- | --- | --- |
| Vercel Go runtime limitation | API routes fail or long tasks timeout | Keep API stateless; preserve migration path to Fly.io/Render/Railway |
| Cookie/CORS complexity | Web and API deploy as separate Vercel projects | Use strict CORS; document auth strategy; consider same-domain deployment later |
| Wails v3 instability | Desktop build or bindings break | Keep desktop as preview until Web/API are stable |
| Plugin over-engineering | Too much time spent on marketplace-like system | Keep compile-time plugins only |
| Secret leakage | Raw token appears in response/log | Add tests for redaction and review logging paths |
| DNS write damage | User changes production DNS accidentally | v1 read-only; future writes require diff and confirmation |
| Free-tier exhaustion | API/storage usage grows | Add usage dashboard later; keep uploads direct-to-R2 |

---

## 17. Suggested Execution Order

1. Complete M0 fully before implementing product features.
2. Complete M1 auth/settings/secrets before connecting external providers.
3. Complete M2 plugin framework before implementing plugin UI.
4. Implement Blog and R2 together enough to validate media workflow.
5. Implement Devtools mostly client-side to get quick user value.
6. Implement Domains read-only and keep writes deferred.
7. Add Desktop only after shared UI/API contracts stabilize.
8. Finish deployment, CI, E2E, and security hardening before calling v1 complete.

---

## 18. Immediate Next Task

Start with **Task M0.1: Initialize Node Workspace**.

Before editing code:

```bash
git status --short
```

After completing the task:

```bash
pnpm install
pnpm lint
pnpm typecheck
git status --short
```

Then commit using the Lore Commit Protocol.

