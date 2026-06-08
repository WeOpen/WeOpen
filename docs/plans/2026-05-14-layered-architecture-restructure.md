# Layered Architecture Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure `apps/web`, `services/api`, and `apps/desktop` into explicit layered architectures without changing product behavior.

**Architecture:** Keep project roots, module roots, Next route paths, and Wails frontend root stable. Move code inside each project into entry, application, feature/domain, adapter, and shared layers; repair imports and configuration after each project-level migration.

**Tech Stack:** pnpm workspaces, Next.js App Router, React 19, TypeScript, Go workspaces/modules, Wails v3, Vite, ESLint, Go test.

---

## Preconditions

- Read `docs/plans/2026-05-14-layered-architecture-restructure-design.md` before starting.
- Run `git status --short` and preserve all existing user changes.
- Do not move generated directories: `apps/web/.next`, `apps/desktop/frontend/dist`, `apps/desktop/bin`, `node_modules`, `tsconfig.tsbuildinfo`, or Wails generated output.
- This is a structural migration. Do not change HTTP routes, UI copy, plugin permissions, cookie behavior, R2 behavior, or persistence semantics.
- Use TDD only for any behavior change discovered during implementation. Pure file moves/import repairs do not need new tests, but they require fresh verification.

## Task 1: Establish baseline verification

**Files:**
- Read only: workspace files.

**Step 1: Check worktree state**

Run:

```bash
git status --short
```

Expected: output may contain prior approved changes. Record anything unexpected before continuing.

**Step 2: Run fast baseline checks**

Run:

```bash
pnpm --filter @weopen/web typecheck
pnpm --filter @weopen/desktop typecheck
cd services/api && go test ./...
cd apps/desktop && go test ./...
```

Expected: all commands pass before restructuring. If a command fails, apply systematic debugging before moving files.

**Step 3: Commit checkpoint if requested**

Do not commit unless the user explicitly asks. If committing is requested, commit only current approved work with a message such as:

```bash
git add <specific-files>
git commit -m "docs: plan layered architecture restructure"
```

## Task 2: Move Web API clients into shared API layer

**Files:**
- Create directory: `apps/web/src/shared/api/`
- Move: `apps/web/src/lib/api.ts` -> `apps/web/src/shared/api/api.ts`
- Move: `apps/web/src/lib/auth.ts` -> `apps/web/src/shared/api/auth.ts`
- Move: `apps/web/src/lib/settings.ts` -> `apps/web/src/shared/api/settings.ts`
- Move: `apps/web/src/lib/blog.ts` -> `apps/web/src/shared/api/blog.ts`
- Move: `apps/web/src/lib/storage-r2.ts` -> `apps/web/src/shared/api/storage-r2.ts`
- Modify imports in:
  - `apps/web/src/features/auth/login-form.tsx`
  - `apps/web/src/features/settings/settings-form.tsx`
  - `apps/web/src/plugins/blog/posts-page.tsx`
  - `apps/web/src/plugins/blog/post-editor.tsx`
  - `apps/web/src/plugins/blog/post-preview.tsx`
  - `apps/web/src/plugins/storage-r2/object-table.tsx`
  - `apps/web/src/plugins/storage-r2/storage-page.tsx`
  - `apps/web/src/plugins/storage-r2/upload-panel.tsx`

**Step 1: Move files**

Use file moves so Git records renames:

```bash
mkdir -p apps/web/src/shared/api
git mv apps/web/src/lib/api.ts apps/web/src/shared/api/api.ts
git mv apps/web/src/lib/auth.ts apps/web/src/shared/api/auth.ts
git mv apps/web/src/lib/settings.ts apps/web/src/shared/api/settings.ts
git mv apps/web/src/lib/blog.ts apps/web/src/shared/api/blog.ts
git mv apps/web/src/lib/storage-r2.ts apps/web/src/shared/api/storage-r2.ts
```

Expected: `apps/web/src/lib` becomes empty or removable.

**Step 2: Update imports**

Replace imports:

```ts
"@/lib/auth" -> "@/shared/api/auth"
"@/lib/settings" -> "@/shared/api/settings"
"@/lib/blog" -> "@/shared/api/blog"
"@/lib/storage-r2" -> "@/shared/api/storage-r2"
"@/lib/api" -> "@/shared/api/api"
```

Keep exported type and function names unchanged.

**Step 3: Verify Web typecheck**

Run:

```bash
pnpm --filter @weopen/web typecheck
```

Expected: PASS. If imports fail, search for remaining `@/lib` references and repair them.

## Task 3: Move Web layout into shared layout layer

**Files:**
- Create directory: `apps/web/src/shared/layout/`
- Move: `apps/web/src/components/app-shell.tsx` -> `apps/web/src/shared/layout/app-shell.tsx`
- Modify imports in:
  - `apps/web/app/storage/page.tsx`
  - `apps/web/app/settings/page.tsx`
  - `apps/web/app/dashboard/page.tsx`
  - `apps/web/app/blog/page.tsx`
  - `apps/web/app/blog/posts/[id]/page.tsx`
  - `apps/web/app/plugins/page.tsx`
  - `apps/web/app/plugins/[pluginId]/page.tsx`

**Step 1: Move AppShell**

Run:

```bash
mkdir -p apps/web/src/shared/layout
git mv apps/web/src/components/app-shell.tsx apps/web/src/shared/layout/app-shell.tsx
```

**Step 2: Update imports**

Replace:

```ts
import { AppShell } from "@/components/app-shell";
```

with:

```ts
import { AppShell } from "@/shared/layout/app-shell";
```

**Step 3: Verify Web lint and typecheck**

Run:

```bash
pnpm --filter @weopen/web lint
pnpm --filter @weopen/web typecheck
```

Expected: both pass.

## Task 4: Move Web plugin business UI into feature layers

**Files:**
- Create directory: `apps/web/src/features/blog/`
- Create directory: `apps/web/src/features/storage-r2/`
- Move: `apps/web/src/plugins/blog/index.tsx` -> `apps/web/src/features/blog/index.tsx`
- Move: `apps/web/src/plugins/blog/posts-page.tsx` -> `apps/web/src/features/blog/posts-page.tsx`
- Move: `apps/web/src/plugins/blog/post-editor.tsx` -> `apps/web/src/features/blog/post-editor.tsx`
- Move: `apps/web/src/plugins/blog/post-preview.tsx` -> `apps/web/src/features/blog/post-preview.tsx`
- Move: `apps/web/src/plugins/storage-r2/index.tsx` -> `apps/web/src/features/storage-r2/index.tsx`
- Move: `apps/web/src/plugins/storage-r2/object-table.tsx` -> `apps/web/src/features/storage-r2/object-table.tsx`
- Move: `apps/web/src/plugins/storage-r2/storage-page.tsx` -> `apps/web/src/features/storage-r2/storage-page.tsx`
- Move: `apps/web/src/plugins/storage-r2/upload-panel.tsx` -> `apps/web/src/features/storage-r2/upload-panel.tsx`
- Modify: `apps/web/src/plugins/registry.tsx`
- Modify app route imports:
  - `apps/web/app/storage/page.tsx`
  - `apps/web/app/blog/page.tsx`
  - `apps/web/app/blog/posts/[id]/page.tsx`

**Step 1: Move feature files**

Run:

```bash
mkdir -p apps/web/src/features/blog apps/web/src/features/storage-r2
git mv apps/web/src/plugins/blog/index.tsx apps/web/src/features/blog/index.tsx
git mv apps/web/src/plugins/blog/posts-page.tsx apps/web/src/features/blog/posts-page.tsx
git mv apps/web/src/plugins/blog/post-editor.tsx apps/web/src/features/blog/post-editor.tsx
git mv apps/web/src/plugins/blog/post-preview.tsx apps/web/src/features/blog/post-preview.tsx
git mv apps/web/src/plugins/storage-r2/index.tsx apps/web/src/features/storage-r2/index.tsx
git mv apps/web/src/plugins/storage-r2/object-table.tsx apps/web/src/features/storage-r2/object-table.tsx
git mv apps/web/src/plugins/storage-r2/storage-page.tsx apps/web/src/features/storage-r2/storage-page.tsx
git mv apps/web/src/plugins/storage-r2/upload-panel.tsx apps/web/src/features/storage-r2/upload-panel.tsx
```

**Step 2: Update plugin registry imports**

In `apps/web/src/plugins/registry.tsx`, import feature components from:

```ts
import { BlogPluginPage } from "@/features/blog";
import { StorageR2PluginPage } from "@/features/storage-r2";
```

Do not move `apps/web/src/plugins/index.ts` or `apps/web/src/plugins/registry.tsx` in this task; they remain the plugin registration boundary.

**Step 3: Update direct route imports**

Replace direct plugin UI imports:

```ts
"@/plugins/blog" -> "@/features/blog"
"@/plugins/storage-r2" -> "@/features/storage-r2"
```

**Step 4: Verify no business UI remains under plugin registry boundary**

Run:

```bash
git status --short
pnpm --filter @weopen/web typecheck
```

Expected: typecheck passes and `apps/web/src/plugins/` contains only registry/manifest files.

## Task 5: Verify Web build and browser behavior

**Files:**
- No source changes expected unless verification reveals import-only issues.

**Step 1: Run Web verification**

Run:

```bash
pnpm --filter @weopen/web lint
pnpm --filter @weopen/web typecheck
pnpm --filter @weopen/web build
```

Expected: all pass.

**Step 2: Run browser smoke test**

Start the Web dev server through the configured preview server `web` and check:

- `/dashboard`
- `/blog`
- `/storage`
- `/settings`
- `/plugins`

Expected: pages render. If the API is not running, plugin pages may show fetch failures, but there must be no client-side crashes or console errors caused by missing modules.

## Task 6: Move API packages into domain and adapters layers

**Files:**
- Create directory: `services/api/internal/domain/`
- Create directory: `services/api/internal/adapters/`
- Move: `services/api/internal/auth` -> `services/api/internal/domain/auth`
- Move: `services/api/internal/settings` -> `services/api/internal/domain/settings` if the directory exists when implementing
- Move: `services/api/internal/audit` -> `services/api/internal/domain/audit`
- Move: `services/api/internal/pluginstate` -> `services/api/internal/domain/pluginstate`
- Move: `services/api/internal/http` -> `services/api/internal/adapters/http`
- Move: `services/api/internal/db` -> `services/api/internal/adapters/db`
- Move: `services/api/internal/secrets` -> `services/api/internal/adapters/secrets`
- Keep: `services/api/internal/config`
- Modify imports in all moved Go files and `services/api/cmd/api/main.go`

**Step 1: Move directories**

Run:

```bash
mkdir -p services/api/internal/domain services/api/internal/adapters
git mv services/api/internal/auth services/api/internal/domain/auth
git mv services/api/internal/audit services/api/internal/domain/audit
git mv services/api/internal/pluginstate services/api/internal/domain/pluginstate
git mv services/api/internal/http services/api/internal/adapters/http
git mv services/api/internal/db services/api/internal/adapters/db
git mv services/api/internal/secrets services/api/internal/adapters/secrets
```

If `services/api/internal/settings` exists at implementation time, move it with:

```bash
git mv services/api/internal/settings services/api/internal/domain/settings
```

**Step 2: Update Go import paths**

Replace import prefixes:

```go
"github.com/WeOpen/WeOpen/services/api/internal/auth" -> "github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
"github.com/WeOpen/WeOpen/services/api/internal/audit" -> "github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
"github.com/WeOpen/WeOpen/services/api/internal/pluginstate" -> "github.com/WeOpen/WeOpen/services/api/internal/domain/pluginstate"
"github.com/WeOpen/WeOpen/services/api/internal/http" -> "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
"github.com/WeOpen/WeOpen/services/api/internal/db" -> "github.com/WeOpen/WeOpen/services/api/internal/adapters/db"
"github.com/WeOpen/WeOpen/services/api/internal/secrets" -> "github.com/WeOpen/WeOpen/services/api/internal/adapters/secrets"
```

Use aliases where existing names would conflict:

```go
apihttp "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
```

**Step 3: Run Go formatting and package tests**

Run:

```bash
gofmt -w services/api/cmd/api services/api/internal
cd services/api && go test ./...
```

Expected: all API tests pass. If package comments mention old paths, update comments without changing behavior.

## Task 7: Add API application bootstrap layer

**Files:**
- Create: `services/api/internal/app/server.go`
- Create: `services/api/internal/app/plugins.go`
- Modify: `services/api/cmd/api/main.go`

**Step 1: Extract app bootstrap without changing behavior**

Create `services/api/internal/app/server.go` with a minimal public bootstrap API. Shape the code around existing `cmd/api/main.go` wiring; do not invent configuration fields.

Expected structure:

```go
package app

import (
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
)

// ServerBundle contains the HTTP handler and runtime address assembled for the API process.
type ServerBundle struct {
	Address string
	Handler http.Handler
}

// NewServerBundle wires API domain services, adapters, and built-in plugins from config.
func NewServerBundle(cfg config.Config) (ServerBundle, error) {
	// Move existing main.go service construction here.
}
```

Adjust exact signatures to match the current config type. Keep behavior identical.

**Step 2: Move plugin wiring into `plugins.go`**

Create helper functions in `services/api/internal/app/plugins.go` for built-in plugin setup. Keep route prefixes and permissions unchanged:

```go
"/api/plugins/blog"
"/api/plugins/storage-r2"
```

Keep existing required permissions unchanged:

```go
plugin.PermissionBlogRead
plugin.PermissionStorageRead
```

**Step 3: Slim `cmd/api/main.go`**

`main.go` should only:

1. load config,
2. call app bootstrap,
3. start `http.ListenAndServe`,
4. log fatal startup errors.

**Step 4: Verify API behavior**

Run:

```bash
gofmt -w services/api/cmd/api services/api/internal/app services/api/internal
cd services/api && go test ./...
```

Expected: all tests pass.

## Task 8: Move Desktop Go service into internal app layer

**Files:**
- Create directory: `apps/desktop/internal/app/`
- Move: `apps/desktop/app.go` -> `apps/desktop/internal/app/app.go`
- Move or modify: `apps/desktop/app_test.go` -> `apps/desktop/internal/app/app_test.go`
- Modify: `apps/desktop/main.go`

**Step 1: Move service files**

Run:

```bash
mkdir -p apps/desktop/internal/app
git mv apps/desktop/app.go apps/desktop/internal/app/app.go
git mv apps/desktop/app_test.go apps/desktop/internal/app/app_test.go
```

**Step 2: Rename package**

In moved files, change:

```go
package main
```

To:

```go
package app
```

**Step 3: Update main import and constructor call**

In `apps/desktop/main.go`, import:

```go
import desktopapp "github.com/WeOpen/WeOpen/apps/desktop/internal/app"
```

Change:

```go
appService := NewApp(appVersion)
```

To:

```go
appService := desktopapp.NewApp(appVersion)
```

Do not move `apps/desktop/main.go` yet unless Wails build verification remains green after this task.

**Step 4: Verify desktop Go tests**

Run:

```bash
gofmt -w apps/desktop/main.go apps/desktop/internal/app
cd apps/desktop && go test ./...
```

Expected: all desktop Go tests pass.

## Task 9: Layer Desktop frontend

**Files:**
- Create directory: `apps/desktop/frontend/src/features/home/`
- Create directory: `apps/desktop/frontend/src/shared/`
- Move: `apps/desktop/frontend/src/App.tsx` -> `apps/desktop/frontend/src/features/home/app.tsx`
- Modify: `apps/desktop/frontend/src/main.tsx`
- Move CSS if present in `apps/desktop/frontend/src/style.css` to `apps/desktop/frontend/src/features/home/style.css`

**Step 1: Inspect CSS file existence**

Check whether `apps/desktop/frontend/src/style.css` exists. If it exists, move it with the feature. If it does not exist, update imports based on the actual stylesheet path.

**Step 2: Move home feature component**

Run:

```bash
mkdir -p apps/desktop/frontend/src/features/home apps/desktop/frontend/src/shared
git mv apps/desktop/frontend/src/App.tsx apps/desktop/frontend/src/features/home/app.tsx
```

If `style.css` exists:

```bash
git mv apps/desktop/frontend/src/style.css apps/desktop/frontend/src/features/home/style.css
```

**Step 3: Update exports and imports**

In `apps/desktop/frontend/src/features/home/app.tsx`, keep:

```ts
export function App() { ... }
```

Update stylesheet import to:

```ts
import "./style.css";
```

In `apps/desktop/frontend/src/main.tsx`, import:

```ts
import { App } from "@/features/home/app";
```

**Step 4: Verify desktop frontend**

Run:

```bash
pnpm --filter @weopen/desktop lint
pnpm --filter @weopen/desktop typecheck
pnpm --filter @weopen/desktop build
```

Expected: all pass.

## Task 10: Decide whether to move Desktop Go entry to `cmd/desktop`

**Files:**
- Candidate move: `apps/desktop/main.go` -> `apps/desktop/cmd/desktop/main.go`
- Modify if moved:
  - `apps/desktop/Taskfile.yml`
  - `apps/desktop/build/config.yml`
  - `apps/desktop/cmd/desktop/main.go`

**Step 1: Try only if Task 8 and Task 9 are green**

If desktop verification is green, evaluate whether moving the entrypoint adds value. If Wails tooling expects `go run .`, prefer leaving `main.go` at the module root and document the reason.

**Step 2A: If moving entrypoint, update commands**

Move:

```bash
mkdir -p apps/desktop/cmd/desktop
git mv apps/desktop/main.go apps/desktop/cmd/desktop/main.go
```

Update embed path in the moved file:

```go
//go:embed all:../../frontend/dist
```

If Go embed rejects `..`, do not force this design. Move `main.go` back to the module root.

Update build commands:

```yaml
# apps/desktop/Taskfile.yml
go build -o bin/weopen-desktop.exe ./cmd/desktop

# apps/desktop/build/config.yml
go run ./cmd/desktop
```

**Step 2B: If not moving entrypoint, document exception**

Keep `apps/desktop/main.go` at root and note in docs that Wails embed/tooling keeps the entry layer at the module root while service bindings live in `internal/app`.

**Step 3: Verify Wails-sensitive build**

Run:

```bash
cd apps/desktop && go test ./...
pnpm --filter @weopen/desktop build
```

Expected: both pass. If moving `main.go` breaks embed or Wails dev config, revert only that entrypoint move and keep Task 8 layering.

## Task 11: Update documentation for the new structure

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `docs/DESIGN-personal-management-platform.md`
- Modify if needed: `docs/development/DEVELOPMENT_STANDARDS.md`
- Keep: `docs/plans/2026-05-14-layered-architecture-restructure-design.md`
- Keep: `docs/plans/2026-05-14-layered-architecture-restructure.md`

**Step 1: Update `CLAUDE.md`**

Revise project overview and architecture notes to reflect:

- Web feature code under `apps/web/src/features`.
- Web shared API/layout under `apps/web/src/shared`.
- Web plugin manifests/registry under `apps/web/src/plugins`.
- API app bootstrap under `services/api/internal/app`.
- API domain packages under `services/api/internal/domain`.
- API adapters under `services/api/internal/adapters`.
- Desktop service bindings under `apps/desktop/internal/app`.

Do not remove command references unless commands changed.

**Step 2: Update `README.md`**

Update the high-level repository structure section only. Keep product-facing content concise.

**Step 3: Update design documentation**

In `docs/DESIGN-personal-management-platform.md`, update sections that describe:

- API startup and plugin wiring.
- Web plugin UI registry.
- Desktop shell structure.
- Current persistence boundary if paths changed.

**Step 4: Update development standards only if they name old paths**

Search the standards for old paths. If they only describe principles, do not edit them.

**Step 5: Verify docs references are not stale**

Run targeted searches:

```bash
# Use the project search tool or equivalent to check stale references.
# Patterns:
apps/web/src/lib
apps/web/src/components/app-shell
services/api/internal/http
services/api/internal/auth
services/api/internal/db
services/api/internal/secrets
apps/desktop/app.go
```

Expected: no stale references except historical plan/design docs where old paths are intentionally described.

## Task 12: Full workspace verification

**Files:**
- No source changes expected unless verification finds migration errors.

**Step 1: Format Go code**

Run:

```bash
gofmt -l services/api apps/desktop internal
```

Expected: no output. If output appears, run `gofmt -w` on listed files, then repeat.

**Step 2: Run full validation**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:go
cd apps/desktop && go test ./...
```

Expected: all pass.

**Step 3: Run browser smoke test**

Start Web dev server through preview config `web`. Verify:

- `/dashboard`
- `/blog`
- `/storage`
- `/settings`
- `/plugins`

Expected: no module resolution crashes and no new console errors. API-dependent fetch errors are acceptable only if the API server is not running; state that explicitly in the final report.

## Task 13: Final review and reporting

**Files:**
- Review all changed files.

**Step 1: Inspect diff**

Run:

```bash
git status --short
git diff --stat
git diff -- apps/web services/api apps/desktop CLAUDE.md README.md docs/DESIGN-personal-management-platform.md docs/development/DEVELOPMENT_STANDARDS.md docs/plans
```

Expected: diff is primarily renames/import updates/docs. No unrelated behavior changes.

**Step 2: Report results**

Final report must include:

- Web structure changes.
- API structure changes.
- Desktop structure changes.
- Documentation updates.
- Verification commands run with results.
- Any intentional deviations, especially whether `apps/desktop/main.go` stayed at root for Wails compatibility.
- KISS/YAGNI/DRY/SOLID summary.

Do not claim completion without fresh verification evidence from Task 12.
