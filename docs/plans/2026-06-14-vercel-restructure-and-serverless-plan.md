# 执行计划：Vercel 免费层部署 + 仓库分层重构（2026-06-14）

> 决策依据：`docs/adr/0001-vercel-go-serverless-and-restructure.md`。
> 执行方式：建议配合 superpowers:executing-plans 按阶段推进；每阶段必须验证通过再进入下一阶段。

**目标**：让前后端都能部署到 Vercel 免费层（保留 Go），同时把仓库顶层结构理清。分两类工作：
- **结构类（行为不变）**：纯文件搬移/改名 + 修 import/配置。改完用编译+测试验证即可，不需新测试。
- **能力类（行为变更）**：Go API 无状态化 + serverless 入口 + 部署适配。按 TDD，先补测试再改实现。

**前置**：
- `git status --short` 记录现有改动，勿覆盖。
- 不移动生成物：`.next`、`apps/desktop/frontend/dist`、`apps/desktop/bin`、`node_modules`、Wails 生成目录。
- 每阶段一个 commit（用户要求时才提交）。

---

## Phase 0 — 基线验证（必须全绿）

```bash
pnpm -r typecheck && pnpm -r lint && pnpm -r test
go build ./... && go test ./...
pnpm --filter @weopen/web build
```
记录结果作为重构前基线。任一失败先修或记录。

---

## Phase 1 — 顶层结构重构（行为不变）

> 每一步做完立即 `go build ./... && go test ./...`（Go 相关）或 `pnpm -r typecheck`（TS 相关）。一步一验证，避免一次性大爆炸。

**1a. 根 `internal/` → `platform/`**（最高风险，单独做）
- `git mv internal platform`
- 改 8 个 `go.mod`：`module github.com/WeOpen/WeOpen/internal/...` → `.../platform/...`
- 全仓替换 import：`WeOpen/WeOpen/internal/` → `WeOpen/WeOpen/platform/`（影响约 25 个 `.go`）
- 改 `go.work` 的 `use (./internal/...)` → `./platform/...`
- 验证：`go work sync && go build ./... && go test ./...`

**1b. `db/migrations` → `services/api/migrations`**
- `git mv db/migrations services/api/migrations`（删空的 `db/`）
- 改 `services/api/internal/adapters/db/migrate.go` 里迁移文件路径常量
- 验证：`go test ./services/api/...`

**1c. `packages/sdk` → `packages/api-client`**
- `git mv packages/sdk packages/api-client`；改其 `package.json` name → `@weopen/api-client`
- 全仓替换 import `@weopen/sdk` → `@weopen/api-client`（5 个 TS 文件）；`pnpm install` 重链
- 验证：`pnpm -r typecheck`

**1d. `nullframe/` → `experiments/nullframe/`**
- `git mv nullframe experiments/nullframe`；它不在 workspace，确认 `pnpm-workspace.yaml` 不含它（现状不含）
- 若决定抽离独立仓库，改为记录在 `docs/` 并从本仓移除（二选一，待定）

**1e. 根文档/杂物归位**
- `git mv PLAN.md docs/PLAN.md`；`git mv design-qa.md docs/design-qa.md`；`CREDITS.md` 视情况进 `docs/`
- `tmp/`、`test-results/` 加入 `.gitignore`，从版本库移除（保留本地）
- 新增空骨架：`infra/`（含 `infra/README.md` 占位）

**1f. 文档同步**：更新 `CLAUDE.md`、`README.md` 的目录/命令说明到新结构。
- 验证：`pnpm -r typecheck && pnpm -r lint && pnpm -r test && go build ./... && go test ./... && pnpm --filter @weopen/web build` 全绿。

---

## Phase 2 — Go API 无状态化（行为变更，TDD）

> 目标：同一份领域逻辑，存储后端由"内存（本地/测试）"切换为"Postgres（生产）"，且无任何进程内长存状态。

**2a. 暴露 `http.Handler`**
- 在 `services/api/internal/app` 增加 `NewHandler(cfg) (http.Handler, error)`，把现有 `NewHTTPServer` 改为基于它构造；`cmd/api` 仍用 `NewHTTPServer`（本地 dev）。
- 测试：`server_test.go` 增加对 `NewHandler` 的装配测试。

**2b. 接入 SQL stores（已存在）**
- `config` 增加 `DATABASE_URL`/`APP_ENV` 判定：生产用 `adapters/db` 的 auth/audit/rate-limit stores + plugin state SQL store；本地/测试默认内存。
- 补 plugin state、secrets 的持久化路径（若缺）。
- 测试（TDD）：先写"生产配置下使用 SQL store / 内存配置下使用 memory store"的装配测试，再接线。

**2c. Session 持久化**
- 现状 cookie 已是 HttpOnly；把 session 校验改为 DB 背书（或无状态签名 token，二选一，记录在 ADR 附注）。保持现有 cookie 名/属性/CSRF 双提交语义不变。
- 测试：登录→带 cookie 访问受保护路由→登出 的集成测试，覆盖"换实例/冷启动不丢登录态"。

**2d. Rate-limit 外置**
- `auth_rate_limiter` 后端切到 Postgres（已有 `rate_limit_store.go`）或 Upstash；本地仍内存。
- 测试：超阈值返回限流；窗口重置；跨实例共享计数。
- 验证：`go test ./services/api/...` 全绿；本地 `pnpm dev:api` + `dev:web` 手测登录闭环。

---

## Phase 3 — Vercel 部署适配（行为变更，最小）

**3a. Go serverless 入口**
- 新增 `services/api/api/index.go`：导出 `func Handler(w http.ResponseWriter, r *http.Request)`，内部用 `app.NewHandler` 构造一次（包级单例）并委派。
- 新增 `services/api/vercel.json`：`{ "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }] }`，`@vercel/go` builder。

**3b. Web 项目配置**
- `apps/web/vercel.json`（如需）；确认 `NEXT_PUBLIC_API_BASE_URL` 指向 api 项目域名；`/api/[...path]` 代理转发。
- API 侧 `WEB_ORIGIN`/CORS 指向 web 域名。

**3c. 数据与密钥**
- 在 `infra/` 写 `DEPLOYMENT.md`：两个 Vercel 项目的 Root Directory、环境变量清单（`DATABASE_URL`、`SESSION_SECRET`、`SECRET_ENC_KEY`、`R2_*`、`WEB_ORIGIN`、`NEXT_PUBLIC_API_BASE_URL`…）、Neon 配置、migration 运行方式（手动/CI）。
- 提供 `infra/vercel/*.json` 模板。
- 验证：Vercel preview 部署，跑通登录、插件路由、R2 上传链路（人工 checklist）。

---

## Phase 4 — 桌面端定位（行为不变 / 小改）

- 明确 desktop 角色：默认作为已部署 API 的 HTTPS 客户端（复用 `@weopen/api-client` + `packages/ui`）；如需离线，再评估内嵌本地 Go API。
- 仅做必要的 base-url/配置对齐，不动 UI 行为。
- 验证：`pnpm --filter @weopen/desktop build`。

---

## Phase 5 — 文档与规范收口

- 更新 `docs/development/DEVELOPMENT_STANDARDS.md`（新目录与部署边界）、`CLAUDE.md`、`README.md`。
- ADR 状态 `Proposed` → `Accepted`。

---

## 验证矩阵（每阶段结束）

| 检查 | 命令 |
|---|---|
| TS 类型 | `pnpm -r typecheck` |
| Lint | `pnpm -r lint` |
| TS 测试 | `pnpm -r test` |
| Go 编译 | `go build ./...` |
| Go 测试 | `go test ./...` |
| Web 构建 | `pnpm --filter @weopen/web build` |

## 回滚

- 每阶段独立 commit；结构类用 `git mv`，可整阶段 `git revert`。
- Phase 2/3 行为变更前先有测试基线，切换存储后端通过配置开关，可快速切回内存验证定位问题。

## 待定项（Open questions）

- Session：DB 背书 vs 无状态签名 token —— 在 2c 决定并补记 ADR。
- 限流后端：Postgres vs Upstash Redis（免费额度与延迟权衡）。
- `nullframe`：移入 `experiments/` 还是抽成独立仓库。
- Neon vs Supabase 作为 Postgres 提供方（默认 Neon/Vercel Postgres）。
