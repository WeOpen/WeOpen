# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added CSRF token issuance and double-submit validation for cookie-authenticated unsafe API requests.
- Added SQL-backed login rate-limit buckets so production API instances can share lockout state.
- Added SQL-backed audit log persistence and wired database-backed plugin enablement state into API startup.
- Added admin user, role, and session management APIs plus a settings-page access-control panel.
- Added TOTP MFA enrollment, verification, disablement, and login enforcement for MFA-enabled users.
- Added the repository changelog and commit-time changelog policy so future notable changes are recorded in a human-readable release log.
- Added a root `VERSION` file plus `pnpm version:check` / `pnpm version:sync` scripts to keep workspace packages, app versions, and plugin manifests aligned.
- Added changelog validation scripts for checking the Keep a Changelog structure and staged changelog updates before commits.
- Added a same-origin Web API proxy for browser calls so auth cookies keep working when Web and Go API run on different hosts.
- Added login failure rate limiting, cooldown responses, and login success/failure audit entries.
- Added production configuration rejection for default or placeholder admin/session secrets.

### Changed

- Frontend API clients now use a shared credentialed fetch helper that attaches CSRF tokens and preserves structured API errors.
- The plugin registry and dashboard now consume backend plugin enabled state instead of relying only on compile-time manifests.
- The settings screen now reads live provider secret summaries, access-control data, sessions, and audit entries instead of static mock rows.
- Plugin registry, dashboard, and login version displays now read canonical manifest/project versions instead of mock version overrides.
- Login now hides local credential hints by default, starts with an empty email field, renders live API/environment status, and no longer returns raw session tokens in the login JSON response.

### Fixed

- Fixed plugin route permission matching to fail closed for unmatched unsafe plugin endpoints.
- Fixed disabled plugin handling so backend plugin routes reject requests when the plugin is turned off.
- Fixed the design-system page JSX string escaping so Web typechecking succeeds.

### Security

- Added password policy enforcement for newly created users and password changes, with first-login password-change state on admin-created users.
- Added permission-aware navigation/action disabling for plugin and user-management surfaces.

## [0.1.0] - 2026-06-07

### Added

- Initial WeOpen workspace with a Next.js management UI, Go HTTP API, Wails desktop shell, shared UI package, plugin SDK, and Go workspace modules.
- Nothing-style admin experience for the dashboard, plugin registry, custom plugin pages, devtools, storage, settings, and login surfaces.
- Local-first admin authentication flow with login/logout, session checks, route guards, RBAC permission responses, audit logging, and protected plugin/API routes.
- PostgreSQL-backed auth, session, RBAC, and plugin state persistence when `DATABASE_URL` and migrations are configured, with memory-backed local defaults for development.
- Built-in plugin contracts and manifests for Blog, Storage R2, Devtools, and Domains, including compile-time Web registration and backend plugin route mounting.
- Blog and Storage R2 feature foundations, including article management surfaces, object listing, upload URL completion flow, and R2 provider boundaries.
- Development standards, architecture notes, migration guidance, environment examples, and verification commands for the monorepo.

### Fixed

- Normalized admin shell scrolling, table overflow behavior, sidebar density, icon sizing, login viewport fit, and custom dot-matrix scrollbar styling.

[Unreleased]: https://github.com/WeOpen/WeOpen/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/WeOpen/WeOpen/releases/tag/v0.1.0
