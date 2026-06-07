# 个人管理平台技术设计文档

版本：v0.1  
日期：2026-05-13  
状态：草案  
对应 PRD：`docs/PRD-personal-management-platform.md`

## 1. 技术目标

本设计要解决四件事：

1. 在没有自有服务器的前提下，用免费或低成本平台部署 Web 和 API。
2. 用一个代码仓同时支持 Next.js Web、Go API 和 Wails v3 桌面端。
3. 通过插件机制扩展博客、工具箱、域名、R2 存储等能力。
4. 保持后续迁移能力，避免被 Vercel、R2 或某个数据库强绑定。

## 2. 总体架构

```text
                   ┌─────────────────────────┐
                   │        Browser           │
                   └───────────┬─────────────┘
                               │
                               ▼
                   ┌─────────────────────────┐
                   │ apps/web                 │
                   │ Next.js                  │
                   └───────────┬─────────────┘
                               │ HTTPS / SDK
                               ▼
                   ┌─────────────────────────┐
                   │ services/api             │
                   │ Go HTTP API              │
                   └───────┬─────────┬───────┘
                           │         │
                  ┌────────▼───┐ ┌───▼────────┐
                  │ Database   │ │ Cloudflare │
                  │ Postgres   │ │ R2         │
                  └────────────┘ └────────────┘

                   ┌─────────────────────────┐
                   │ apps/desktop             │
                   │ Wails v3 + React + Go    │
                   └───────────┬─────────────┘
                               │
                Remote API or local Go service bindings
```

## 3. Monorepo 结构

建议使用 pnpm workspace + Go workspace。

```text
personal-platform/
  apps/
    web/
      app/
      src/
        features/
        plugins/
        shared/
      next.config.ts
      package.json
    desktop/
      frontend/
        src/
          features/
          shared/
      internal/
        app/
      wails.json
      go.mod
  services/
    api/
      cmd/api/
      internal/
        adapters/
        app/
        config/
        domain/
      go.mod
  packages/
    ui/
    sdk/
    plugin-sdk/
    config/
  internal/
    core/
      auth/
      plugin/
      settings/
      storage/
      audit/
    providers/
      cloudflare/
      vercel/
      r2/
    plugins/
      blog/
      devtools/
      domains/
      storage_r2/
  db/
    migrations/
    seed/
  docs/
  scripts/
```

### 3.1 目录职责

- `apps/web`：Next.js Web 端，负责后台界面、博客公开页、插件 UI 容器。
- `services/api`：Go API 服务，负责认证、业务逻辑、插件 API、外部服务调用。
- `apps/desktop`：Wails v3 桌面端，复用 React UI，调用本地 Go 或远程 API。
- `packages/ui`：跨 Web/桌面复用的 React 组件。
- `packages/sdk`：由 OpenAPI 生成的 TypeScript API Client。
- `packages/plugin-sdk`：插件 manifest、权限、导航、组件扩展点类型。
- `internal/core`：平台核心领域逻辑。
- `internal/plugins`：内置插件后端实现。
- `db/migrations`：数据库迁移。

## 4. 技术选型

| 层 | 选型 | 原因 |
| --- | --- | --- |
| Web | Next.js App Router | 适合 Vercel，支持管理后台和博客公开页 |
| API | Go + net/http/chi | 小而稳定，serverless 友好 |
| 桌面 | Wails v3 | Go + Web UI 复用，适合个人桌面工具 |
| UI | React + Tailwind 或 shadcn/ui 风格组件 | 开发效率高，适合后台工具 |
| API 协议 | REST + OpenAPI | 简单、可生成 SDK、易调试 |
| 数据库 | Postgres 优先 | 查询能力完整，后续扩展稳定 |
| 对象存储 | Cloudflare R2 | 免费层适合个人文件和博客素材 |
| 包管理 | pnpm workspace | 管理 Next.js 和共享 TS 包 |
| Go 多模块 | go.work | 管理 API、桌面和共享 Go 代码 |

## 5. 部署设计

### 5.1 v1 推荐部署：两个 Vercel 项目

由于前后端技术栈不同，v1 推荐保守部署：

- Vercel Project A：`apps/web`
- Vercel Project B：`services/api`
- Web 通过 `NEXT_PUBLIC_API_BASE_URL` 调用 API。
- API 通过 CORS 限制允许 Web 域名访问。

优点：

- 结构清晰。
- 避免单项目路由和构建耦合。
- API 后续可以迁移到其他平台。

缺点：

- 多一个 Vercel 项目。
- Cookie 同站策略需要额外设计。

### 5.2 后续部署：Vercel Services

如果 Vercel Services 对当前账号可用，可将 Web 和 Go API 作为同一项目下的服务：

- `/` 路由到 Next.js。
- `/api/*` 路由到 Go API。

优点：

- 同域名部署。
- Cookie 和 CORS 更简单。

风险：

- 当前可用性和限制需要按账号实际情况确认。
- 不应把 v1 架构写死在该能力上。

### 5.3 环境变量

Web：

```text
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_APP_NAME=
```

API：

```text
APP_ENV=
APP_URL=
WEB_ORIGIN=
DATABASE_URL=
MIGRATIONS_DIR=db/migrations
SESSION_SECRET=
SECRET_ENCRYPTION_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
CLOUDFLARE_API_TOKEN=
VERCEL_API_TOKEN=
```

### 5.4 Serverless 约束

Go API 必须满足：

- 请求内完成业务逻辑。
- 不依赖内存状态。
- 不启动常驻后台 worker。
- 长任务拆成短任务或由外部 Cron 触发。
- 文件上传优先使用预签名 URL，避免 API 转发大文件。

## 6. API 设计

### 6.1 分层

```text
services/api/internal/adapters/http
  -> request validation
  -> auth/session middleware
  -> services/api/internal/domain/{auth,audit,pluginstate}
  -> repository/provider adapters
  -> response mapper
```

应用装配放在 `services/api/internal/app`，`cmd/api/main.go` 只保留启动入口。

### 6.2 错误结构

```json
{
  "error": {
    "code": "DOMAIN_TOKEN_INVALID",
    "message": "Cloudflare API Token 无效或权限不足",
    "requestId": "req_..."
  }
}
```

### 6.3 API 命名空间

平台 API：

```text
/api/auth/*
/api/me
/api/dashboard
/api/plugins
/api/settings
/api/secrets
/api/audit-logs
```

插件 API：

```text
/api/plugins/{pluginId}/*
```

示例：

```text
/api/plugins/blog/posts
/api/plugins/domains/assets
/api/plugins/storage-r2/objects
```

### 6.4 SDK 生成

Go API 维护 OpenAPI 文档：

```text
services/api/openapi.yaml
```

生成：

```text
packages/sdk/src/client.ts
```

Web 和桌面前端都通过 SDK 调用远程 API。

## 7. 插件系统设计

### 7.1 插件原则

v1 使用编译期插件，不做远程动态插件安装。

原因：

- 避免 serverless 环境动态加载限制。
- 避免第三方代码安全风险。
- 保持构建和部署简单。
- 方便统一迁移和测试。

### 7.2 后端插件接口

```go
package plugin

type Plugin interface {
    ID() string
    Name() string
    Version() string
    Manifest() Manifest
    RegisterRoutes(r Router, deps Dependencies)
    Migrate(ctx context.Context, db DB) error
    Dashboard(ctx context.Context, userID string) ([]Widget, error)
}

type Manifest struct {
    ID          string
    Name        string
    Description string
    Version     string
    Permissions []Permission
    Settings    []SettingField
    Navigation  []NavItem
}
```

### 7.3 插件注册

```go
func RegisterBuiltins(registry *plugin.Registry) {
    registry.MustRegister(blog.New())
    registry.MustRegister(devtools.New())
    registry.MustRegister(domains.New())
    registry.MustRegister(storageR2.New())
}
```

平台启动时：

1. 注册内置插件。
2. 读取数据库中的启用状态。
3. 执行插件迁移。
4. 挂载插件 API 路由。
5. 暴露插件 manifest 给前端。

### 7.4 前端插件 Manifest

```ts
export interface PluginManifest {
  id: string
  name: string
  description?: string
  version: string
  permissions: string[]
  nav?: PluginNavItem[]
  widgets?: PluginWidgetManifest[]
  settings?: PluginSettingSchema[]
}

export interface PluginNavItem {
  title: string
  path: string
  icon: string
  order?: number
}
```

### 7.5 前端插件加载

v1 前端也采用编译期注册，插件边界保持在 `apps/web/src/plugins/index.ts` 和 `apps/web/src/plugins/registry.tsx`。具体业务 UI 放在 feature 目录，例如 `apps/web/src/features/blog` 与 `apps/web/src/features/storage-r2`，共享 API 客户端与布局分别放在 `apps/web/src/shared/api` 和 `apps/web/src/shared/layout`。

插件前端需要提供：

- 路由组件。
- Dashboard Widget。
- 设置页片段。
- 图标。
- 权限声明。

### 7.6 插件启停

数据库表 `plugins` 保存：

- `id`
- `version`
- `enabled`
- `installed_at`
- `updated_at`

插件禁用后：

- 菜单隐藏。
- Dashboard Widget 隐藏。
- 插件 API 返回 404 或 403。
- 数据不删除。

## 8. 数据库设计

### 8.1 核心表

```sql
users (
  id,
  email,
  password_hash,
  display_name,
  created_at,
  updated_at
)

sessions (
  id,
  user_id,
  token_hash,
  expires_at,
  created_at
)

plugins (
  id,
  version,
  enabled,
  created_at,
  updated_at
)

plugin_settings (
  id,
  plugin_id,
  key,
  value_json,
  updated_at
)

secrets (
  id,
  provider,
  name,
  encrypted_value,
  last4,
  created_at,
  updated_at
)

audit_logs (
  id,
  actor_user_id,
  plugin_id,
  action,
  target_type,
  target_id,
  metadata_json,
  created_at
)

notifications (
  id,
  type,
  title,
  body,
  status,
  source_plugin_id,
  created_at,
  read_at
)
```

### 8.2 博客表

```sql
blog_posts (
  id,
  title,
  slug,
  summary,
  content_markdown,
  status,
  cover_object_key,
  seo_json,
  published_at,
  created_at,
  updated_at
)

blog_terms (
  id,
  type,
  name,
  slug
)

blog_post_terms (
  post_id,
  term_id
)
```

### 8.3 域名表

```sql
domain_assets (
  id,
  name,
  provider,
  provider_ref,
  expires_at,
  metadata_json,
  created_at,
  updated_at
)

dns_record_snapshots (
  id,
  domain_asset_id,
  provider_record_id,
  record_type,
  name,
  value,
  ttl,
  proxied,
  synced_at
)
```

### 8.4 R2 索引表

```sql
storage_objects (
  id,
  provider,
  bucket,
  object_key,
  content_type,
  size_bytes,
  etag,
  visibility,
  metadata_json,
  created_at,
  updated_at
)
```

## 9. R2 存储设计

### 9.1 用途

- 博客封面。
- 博客附件。
- 图片素材库。
- 导出备份。
- 用户上传文件。

### 9.2 Bucket 规划

v1 可以使用一个 Bucket：

```text
personal-platform
```

对象 key 规范：

```text
blog/covers/{yyyy}/{mm}/{uuid}.{ext}
blog/assets/{postId}/{uuid}.{ext}
storage/files/{yyyy}/{mm}/{uuid}-{filename}
backups/{yyyy}/{mm}/{dd}/{filename}
```

### 9.3 上传流程

推荐使用预签名 URL：

1. 前端请求 `POST /api/plugins/storage-r2/upload-url`。
2. API 校验权限和文件信息。
3. API 生成预签名上传 URL。
4. 前端直传 R2。
5. 前端通知 API 写入对象索引。

优点：

- 减少 API 带宽。
- 避免 serverless 请求体限制。
- 适合大文件上传。

## 10. 域名和外部服务设计

### 10.1 Provider 抽象

```go
type DomainProvider interface {
    ListDomains(ctx context.Context) ([]Domain, error)
    ListDNSRecords(ctx context.Context, domain string) ([]DNSRecord, error)
    CheckCertificate(ctx context.Context, domain string) (*CertificateStatus, error)
}
```

v1 实现：

- Cloudflare Provider。
- 手动录入 Provider。

v2 可扩展：

- Vercel Domains。
- Namecheap。
- Porkbun。

### 10.2 写操作策略

v1 默认只读。

如果开启 DNS 写操作，必须：

- 显示 diff。
- 输入确认文本。
- 记录审计日志。
- 支持回滚建议，但不承诺自动回滚。

## 11. 认证与会话

### 11.1 Web 认证

推荐：

- API 设置 HttpOnly Session Cookie。
- Web 与 API 如果不同域名，需要配置 CORS 和 Cookie SameSite。
- 如果两项目部署导致 Cookie 麻烦，v1 可使用 Bearer Token 存储在安全策略较严的客户端状态中，但要优先评估风险。

### 11.2 桌面认证

桌面端支持两种模式：

1. 远程 API 模式：用户输入 API 地址，登录后保存 token。
2. 本地模式：后续版本在本地运行 Go 服务和 SQLite/libSQL。

v1 推荐先做远程 API 模式，降低复杂度。

### 11.3 密钥加密

API 使用 `SECRET_ENCRYPTION_KEY` 加密 `secrets.encrypted_value`。

原则：

- 密钥只在服务端解密。
- 日志永不输出原始密钥。
- 前端只显示 provider、name、last4、更新时间。

## 12. 桌面端设计

### 12.1 v1 桌面目标

- 启动桌面壳。
- 复用 `packages/ui`。
- 提供工具箱本地能力。
- 连接远程 API 查看 Dashboard、博客草稿和文件。

### 12.2 Wails 绑定

桌面端 Go 服务放在 `apps/desktop/internal/app`，根目录 `apps/desktop/main.go` 保持不动以满足 Wails `go:embed` 约束。桌面前端首页 UI 放在 `apps/desktop/frontend/src/features/home`，`apps/desktop/frontend/src/shared` 预留给未来共享前端代码。

桌面端 Go 暴露本地能力：

```go
type App struct {}

func (a *App) FormatJSON(input string) (string, error) {}
func (a *App) DecodeJWT(input string) (*JWTResult, error) {}
func (a *App) SaveLocalPreference(key string, value string) error {}
func (a *App) GetLocalPreference(key string) (string, error) {}
```

### 12.3 代码复用边界

可复用：

- React UI 组件。
- 插件前端组件中不依赖 Next.js 的部分。
- API SDK。
- Go 领域逻辑中的纯函数。

不直接复用：

- Next.js Server Components。
- Next.js 路由。
- Vercel 专属 API handler。

## 13. 前端设计

### 13.1 页面布局

管理后台采用固定结构：

```text
┌──────────────────────────────────────┐
│ Topbar: Search / Sync / User          │
├───────────────┬──────────────────────┤
│ Sidebar       │ Page Content          │
│ Dashboard     │                       │
│ Blog          │                       │
│ Tools         │                       │
│ Domains       │                       │
│ Storage       │                       │
│ Plugins       │                       │
│ Settings      │                       │
└───────────────┴──────────────────────┘
```

### 13.2 状态管理

建议：

- 服务端数据：TanStack Query 或 Next.js fetch 缓存策略。
- 表单：React Hook Form 或原生受控表单。
- 全局 UI 状态：轻量 store。

不建议：

- 一开始引入复杂状态机。
- 把所有插件状态放到全局 store。

### 13.3 插件路由

Web 路由建议：

```text
/dashboard
/plugins
/plugins/{pluginId}
/blog
/blog/posts
/blog/posts/{id}
/tools
/domains
/storage
/settings
```

内部可以映射到插件 ID：

```text
blog -> plugins/blog
tools -> plugins/devtools
domains -> plugins/domains
storage -> plugins/storage-r2
```

## 14. 测试策略

### 14.1 Go API

- Handler 单元测试。
- Service 单元测试。
- Repository 集成测试。
- Provider mock 测试。
- 插件注册测试。

重点覆盖：

- 登录。
- 权限校验。
- Secret 加密/解密。
- R2 上传 URL。
- Cloudflare token 错误处理。
- 插件禁用后的 API 访问。

### 14.2 Web

- TypeScript 类型检查。
- 核心组件测试。
- 页面烟测。
- API SDK mock 测试。

重点覆盖：

- 登录态跳转。
- Dashboard 渲染插件卡片。
- 博客编辑保存。
- R2 文件上传流程。
- 高风险操作确认。

### 14.3 桌面

- 本地工具函数测试。
- Wails 绑定测试。
- 桌面启动烟测。

### 14.4 E2E

v1 最少 E2E：

- 登录 -> Dashboard -> 进入博客 -> 创建草稿。
- 上传图片到 R2 -> 在博客中选择封面。
- 配置 Cloudflare Token -> 同步域名列表。

## 15. CI/CD

建议 GitHub Actions：

```text
lint-web
typecheck-web
test-web
test-go
build-web
build-api
build-desktop-smoke
```

分支策略：

- `main` 保持可部署。
- 功能分支使用 `codex/*` 或 `feature/*`。
- PR 必须通过 lint、typecheck、test。

Vercel：

- `apps/web` 自动部署。
- `services/api` 自动部署。

## 16. 可观测性

v1 轻量实现：

- 每个请求生成 request id。
- API 错误日志记录 request id、用户 id、插件 id、错误码。
- 审计日志记录用户可见操作。
- Dashboard 显示最近同步失败。

后续：

- Sentry。
- OpenTelemetry。
- 用量统计。
- API 延迟和错误率面板。

## 17. 安全设计

### 17.1 最小权限

Cloudflare Token 建议按插件能力拆分：

- R2 Token：仅对象存储权限。
- DNS Token：仅指定 Zone 的 DNS 读取权限。
- Registrar 或 DNS 写权限默认不配置。

### 17.2 输入校验

- API 所有输入必须 schema 校验。
- 文件上传限制类型和大小。
- Markdown 渲染必须防 XSS。
- URL 输入需要校验协议和域名。

### 17.3 输出脱敏

以下内容不得原样返回前端：

- API Token。
- R2 Secret。
- Session Token。
- 加密 key。
- 原始错误堆栈。

## 18. 迁移路线

如果 Vercel Go Runtime 不满足需求：

路线 A：Web 保留 Vercel，API 迁移到 Fly.io / Render / Railway。  
路线 B：轻量 API 迁移到 Cloudflare Workers，复杂 Go 逻辑保留桌面/本地。  
路线 C：桌面端本地运行 API，Web 只作为静态/管理界面。

如果数据库免费层不足：

路线 A：Postgres 托管服务升级。  
路线 B：个人单用户模式迁移到 libSQL/Turso。  
路线 C：桌面本地 SQLite + R2 备份。

如果插件数量增加：

路线 A：继续编译期内置插件。  
路线 B：支持插件包源码安装后重新构建。  
路线 C：只对 UI 做远程 manifest，后端能力仍需要显式编译。

## 19. 初始开发顺序

1. 初始化 monorepo。
2. 建立 Next.js Web 壳。
3. 建立 Go API 健康检查和错误结构。
4. 建立数据库迁移。
5. 建立插件注册中心。
6. 接入登录和设置中心。
7. 实现博客插件最小闭环。
8. 实现 R2 插件上传和对象列表。
9. 实现工具箱插件。
10. 实现域名插件只读同步。
11. 建立 Wails 桌面壳并复用工具箱。
12. 补充部署文档和测试。

## 20. 外部参考

- Vercel Go Runtime: https://vercel.com/docs/functions/runtimes/go
- Vercel Monorepos: https://vercel.com/docs/monorepos
- Vercel Services: https://vercel.com/docs/services
- Wails v3: https://v3.wails.io/
- Cloudflare R2 Pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Registrar API: https://developers.cloudflare.com/registrar/registrar-api/

