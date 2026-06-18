# ADR 0001：Go API 作为 Vercel Serverless Functions + 仓库分层重构

- 状态：Accepted（2026-06-15）
- 关联：`docs/plans/2026-05-14-layered-architecture-restructure*`（其"各项目内部分层"成果保留，本 ADR 不重做）
- 执行计划：`docs/plans/2026-06-14-vercel-restructure-and-serverless-plan.md`

## 1. 背景（Context）

当前是 pnpm + go.work 的 monorepo：

- `apps/web`：Next.js 管理 UI + 插件宿主 + `/api/[...path]` 代理。
- `services/api`：Go HTTP API，本地开发保留**常驻 `ListenAndServe`**，Vercel 部署使用 Go serverless handler。`DATABASE_URL` 未配置时默认内存存储；配置后启动路径接入 SQL-backed auth session / rate-limit / secrets / plugin state / audit stores，并应用 `services/api/migrations`。
- `apps/desktop`：Wails v3 壳（Go host + Vite 前端）。
- `platform/`：共享 Go 平台（`core/plugin` 契约、`plugins/*` 内置插件、`providers/*` 外部适配器），共 8 个独立 Go module。
- `packages/`：`ui`、`plugin-sdk`(TS 契约)、`api-client`(TS API client)、`config`。

约束（来自 `docs/PLAN.md` 与用户）：

- 前后端都部署到 **Vercel 免费层（Hobby）**；无自有服务器。
- **Go API 必须兼容 serverless 请求生命周期**（`docs/PLAN.md` 原文）。
- Postgres = 关系真相；Cloudflare R2 = 对象存储；单用户 / 邀请制 v1；编译期内置插件。

问题：

1. **部署不匹配（核心）**：Vercel 免费层只有无状态 serverless 函数，跑不了常驻 Go 服务器；内存存储每次冷启动即丢、并发实例不共享。
2. **结构不清**：两个 `internal/` 撞名；`nullframe/` 孤儿 demo 占据根目录；插件代码散在 4 处；`db/migrations` 与 db 访问分家；根目录杂物（`PLAN.md`/`design-qa.md`/`tmp`/`test-results`）。这些结构项已按本 ADR 收敛到 `platform/`、`experiments/`、`services/api/migrations` 和 `docs/`。

## 2. 决策（Decision）

1. **后端运行时**：保留 Go 六边形架构，部署为 **Vercel Go Serverless Functions**——新增 catch-all 入口 `services/api/api/index.go`，复用现有 `http.Handler`；`cmd/api` 保留为本地 dev 服务器，共用同一 handler。
2. **部署拓扑**：两个 Vercel Hobby 项目。
   - 项目 #1 = `apps/web`（Next.js），经 `/api/[...path]` 代理到项目 #2。
   - 项目 #2 = `services/api`（Go runtime）。
   - 数据：**Neon / Vercel Postgres（免费）= 关系真相**；**Cloudflare R2 = 对象**；**可选 Upstash Redis（免费）= 限流/瞬态**。
3. **无状态化**：用已存在的 SQL stores + migrations 替换内存默认；session 改为 DB 背书（保持 HttpOnly cookie 语义）；rate-limit 外置（Postgres 或 Upstash）；密钥从环境变量读取（12-factor）。本地/测试仍可用内存实现。
4. **仓库重构（行为不变的搬移/改名）**：
   - 根 `internal/` → `platform/`（消除"两个 internal"歧义，去掉 Go `internal/` 跨模块语义）。
   - `db/migrations` → `services/api/migrations`。
   - `packages/sdk` → `packages/api-client`（`@weopen/sdk` → `@weopen/api-client`）。
   - `nullframe/` → `experiments/nullframe/`（或抽成独立仓库）。
   - 根文档归位 `docs/`；新增 `infra/`（Vercel/env/部署说明）与 `docs/adr/`。

## 3. 考虑过的方案（Options）

| 方案 | 说明 | 取舍 |
|---|---|---|
| **A 保留 Go 跑 Vercel 函数（选中）** | catch-all 包住 http.Handler | 保投资、合 PLAN 初衷、改动最小；代价：Vercel Go runtime 社区级、冷启动、单大函数 |
| B 后端改写 Next.js TS route handlers | 领域逻辑迁 TS，Drizzle/Prisma 连 Neon | 最原生、单项目、全链类型；代价：重写认证/TOTP/CSRF/限流/插件/providers，弃 Go，桌面失去 Go 复用 |
| C 后端另寻托管（Fly/Render…） | 保持常驻 Go | 违反"前后端都在 Vercel 免费层"，否决 |

## 4. 后果（Consequences）

正向：保留 Go 投资与测试；与现有 web 代理模型天然契合；桌面可继续复用 Go 核心；满足 Vercel 免费层。

代价/约束：

- **必须完成无状态化**，否则 serverless 下登录态/限流不可靠（这是唯一允许的行为补全）。
- 依赖 `@vercel/go` builder；**冷启动**与 **Hobby 函数时长上限**需关注。
- 需要管理两个 Vercel 项目的环境变量、CORS（`WEB_ORIGIN`）、`NEXT_PUBLIC_API_BASE_URL`。

## 5. 风险与缓解（Risks）

- **Vercel Go 成熟度/时长**：单用户低流量可接受；上线后观测冷启动；必要时把重路由拆成独立函数。
- **模块改名风险**（8 个 `go.mod` 路径 + 25 个 `.go` import + `go.work`）：作为独立阶段执行，`go build ./... && go test ./...` 全绿才继续。
- **无状态化属行为变更**：按 TDD，先补 session / rate-limit / store 的集成测试，再切换默认实现。

## 6. 非目标（Non-goals）

- 不做多租户、公开 SaaS、动态远程插件。
- 不重做各项目内部分层（2026-05-14 已完成）。
- 除"内存 → 持久化"这一必要语义补全外，不改产品行为、HTTP 路由、UI 文案、权限、cookie、R2 语义。

## 7. 实施附注（2026-06-15）

- Session 方案选择 **DB 背书**：继续使用现有 `weopen_session` HttpOnly cookie，服务端只持久化 token hash；`DATABASE_URL` 配置后跨 handler/实例重建仍可校验登录态。
- Rate-limit 方案选择 **Postgres**：复用 `login_attempts` 表；本地/测试未配置数据库时仍使用内存 store。
- Secrets 方案接入 SQL store：provider secrets 先由 `SECRET_ENCRYPTION_KEY` 加密，再写入 `secrets` 表。
- Plugin repository 方案接入 SQL store：`blog_posts`/`storage_objects`/`domain_assets` 等插件表在 `DATABASE_URL` 配置后作为生产持久化后端，本地/测试未配置数据库时仍使用内存 repository。
