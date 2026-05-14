# Layered Architecture Restructure Design

## 背景

当前仓库包含三个主要项目：`apps/web`、`services/api`、`apps/desktop`。它们已经有清晰的产品边界，但内部目录仍混合了路由、业务功能、平台集成、基础设施和共享代码。随着插件、R2、博客、桌面壳等能力增加，继续按当前结构演进会让跨项目职责边界变得模糊。

本设计采用一次性目录重排方案，将三个项目调整为更明确的分层架构。目标不是引入新的框架或抽象，而是把现有代码移动到更能表达职责的位置，并同步修正 imports、构建配置和文档。

## 目标

- 为 `apps/web`、`services/api`、`apps/desktop` 建立一致但不强行相同的分层结构。
- 保持现有功能行为不变，目录迁移本身不引入产品功能。
- 降低业务代码、平台集成、基础设施和 UI 壳层之间的耦合。
- 更新项目文档，使未来开发者能按新结构定位代码。

## 非目标

- 不重写插件系统。
- 不引入完整 RBAC、CQRS、DDD 框架或依赖注入容器。
- 不改变 API 路由协议、Web 页面路径或 Wails 对外行为。
- 不合并 Go modules 或 pnpm packages。
- 不在本次迁移中解决持久化架构问题。

## 主流结构参考

本设计参考主流项目的共同做法，而不是照搬单一模板：

- Next.js 项目通常保留 `app/` 作为路由边界，把业务功能放在 `features/` 或 domain-oriented modules 中。
- Go 服务常见结构是 `cmd/` 只负责进程入口，`internal/` 下分应用装配、领域逻辑和适配器。
- 桌面应用通常把宿主进程服务和前端 UI 分离，前端内部继续按 feature/shared 分层。
- 插件型项目通常保留明确的 registry/manifest 边界，避免业务页面直接承担插件发现和权限语义。

## 总体架构

采用四类层次：

1. **Entry layer**：进程入口、框架路由、Wails 启动点，只负责接入框架生命周期。
2. **Application layer**：组合服务、注册插件、连接配置和依赖，承载 wiring。
3. **Feature/domain layer**：业务能力，如 auth、settings、audit、blog、storage。
4. **Adapter/shared layer**：HTTP、DB、外部 provider、UI primitives、API clients、工具函数。

三项目目录保持各自技术栈习惯，不追求机械统一。

## Web 目录设计

目标结构：

```text
apps/web/
  app/
    dashboard/
    login/
    plugins/[pluginId]/
    settings/
    layout.tsx
    page.tsx
  src/
    features/
      auth/
      blog/
      dashboard/
      settings/
      storage-r2/
    plugins/
      manifests.ts
      registry.tsx
      navigation.ts
    shared/
      api/
      components/
      layout/
      utils/
```

设计说明：

- `app/` 继续作为 Next.js App Router 边界，页面文件只负责路由入口和组合。
- `src/features/*` 承载业务 UI、feature-specific API usage 和页面级状态。
- `src/shared/api` 放浏览器到 API 的 client boundary，例如 auth、settings、blog、storage-r2 client。
- `src/shared/layout` 放 `AppShell` 等跨页面布局。
- `src/plugins` 只保存前端插件 manifest、component registry、navigation 派生逻辑；后端权限仍以 API 为准。

迁移重点：

- 从 `apps/web/src/lib/*` 移到 `src/shared/api/*`。
- 从 `apps/web/src/plugins/blog/*` 移到 `src/features/blog/*`。
- 从 `apps/web/src/plugins/storage-r2/*` 移到 `src/features/storage-r2/*`。
- 保留插件 registry 的稳定导出，避免动态插件页面大改。

## API 目录设计

目标结构：

```text
services/api/
  cmd/api/
    main.go
  internal/
    app/
      server.go
      plugins.go
    domain/
      auth/
      settings/
      audit/
      pluginstate/
    adapters/
      http/
      db/
      secrets/
    config/
```

设计说明：

- `cmd/api/main.go` 只负责读取配置、调用 application bootstrap、启动进程。
- `internal/app` 负责服务装配：auth、settings、audit、plugin registry、plugin routes、stores。
- `internal/domain/*` 放业务语义和接口，避免 HTTP 或 DB 细节泄漏进领域代码。
- `internal/adapters/http` 保留 HTTP server、middleware、handlers、error envelope。
- `internal/adapters/db` 放 SQL opener 和 migration adapter。
- `internal/adapters/secrets` 放加密和 secret persistence adapter；若后续 secrets 成为纯领域服务，可再拆分 domain/adapters。
- `internal/config` 保持配置读取边界。

迁移重点：

- `services/api/internal/http` 移到 `services/api/internal/adapters/http`。
- `services/api/internal/db` 移到 `services/api/internal/adapters/db`。
- `services/api/internal/auth`、`settings`、`audit`、`pluginstate` 移到 `services/api/internal/domain/*`。
- 新增 `internal/app`，把 `cmd/api/main.go` 中的插件 wiring 移入 app 层。

## Desktop 目录设计

目标结构：

```text
apps/desktop/
  cmd/desktop/
    main.go
  internal/
    app/
      app.go
      bindings.go
  frontend/
    src/
      features/
        home/
      shared/
        components/
        wails/
        utils/
```

设计说明：

- Go 端保持轻量，Wails app service 从根目录移入 `internal/app`。
- 若 Wails v3 对入口路径有约束，优先保持构建命令兼容；必要时仅移动 service，不强行移动入口。
- 前端按 feature/shared 分层，当前功能少，因此只迁移明显共享的 Wails runtime、基础 UI 和首页 feature。
- `frontend/dist`、`bin`、`wailsjs` 等生成物不参与迁移。

迁移重点：

- `apps/desktop/app.go` 移到 `apps/desktop/internal/app/app.go`。
- 视 Wails 配置支持程度决定 `main.go` 是否移到 `cmd/desktop/main.go`。
- 更新 embed 路径、Taskfile、Wails 配置和 package scripts 中涉及 `frontend` 的路径。

## 插件边界

后端插件仍位于仓库级 `internal/plugins/*`，不移动到 `services/api/internal`，因为它们是平台内置插件模块，而不是 API 服务私有实现。API 只在 application layer 注册插件。

前端插件 registry 继续存在于 Web 项目内，但业务 UI 移到 feature 层。这样插件系统负责发现和挂载，业务功能负责自己的页面和交互。

## 数据流

Web 请求路径：

```text
app route -> feature component -> shared/api client -> services/api HTTP adapter -> domain service -> store/provider adapter
```

API 启动路径：

```text
cmd/api -> internal/app bootstrap -> domain services + adapters + plugin registry -> HTTP server
```

Desktop 路径：

```text
Wails entry -> internal/app bindings -> frontend feature UI -> shared Wails client
```

## 错误处理

- API 错误 envelope 保持现有 `code/message/requestId` 结构不变。
- 迁移期间不得改变 HTTP status、cookie 行为、插件权限校验或 R2 timeout 行为。
- import 修复和路径配置修复应通过现有测试、lint、typecheck、build 验证。

## 测试策略

目录迁移本身是结构性变更，行为不应改变。验证重点是防止路径、imports、构建配置和模块边界破坏。

必须运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:go
go test ./apps/desktop/...
```

针对迁移过程建议分阶段补充：

```bash
pnpm --filter @weopen/web lint
pnpm --filter @weopen/web typecheck
pnpm --filter @weopen/web build
cd services/api && go test ./...
cd apps/desktop && go test ./...
pnpm --filter @weopen/desktop lint
pnpm --filter @weopen/desktop typecheck
pnpm --filter @weopen/desktop build
```

UI 迁移后需要启动 Web dev server，浏览器验证 dashboard、blog、storage、settings 基本页面可渲染。

## 文档更新范围

迁移后需要同步更新：

- `CLAUDE.md` 的项目结构和命令说明。
- `README.md` 的目录概览。
- `docs/DESIGN-personal-management-platform.md` 中涉及项目布局和插件 wiring 的章节。
- `docs/development/DEVELOPMENT_STANDARDS.md` 如已有目录结构约束，需要与新分层命名保持一致。

## 风险与缓解

- **大 diff 风险**：一次性移动会造成大量 rename。缓解方式是先移动文件，再单独修 imports，避免边移动边重写逻辑。
- **Go module 路径风险**：多个 Go module 独立存在。缓解方式是不移动 module root，只移动 module 内部目录。
- **Next.js 路由风险**：`app/` 路径决定 URL。缓解方式是不改变 `app/` route shape。
- **Wails 构建风险**：embed 和生成路径敏感。缓解方式是优先保持 `frontend` root 不动，修改前后都运行 desktop build。
- **插件 registry 风险**：前后端插件注册边界不同。缓解方式是保持 registry public exports 稳定。

## 推荐实施顺序

1. Web：先迁移 feature/shared/plugin registry，因为 TypeScript imports 容易通过 typecheck 快速验证。
2. API：再迁移 domain/adapters/app，并把 `cmd/api` wiring 瘦身。
3. Desktop：最后迁移 Wails Go service 和 frontend 分层，因为 Wails 路径验证依赖 build。
4. 文档：代码路径稳定后统一更新文档，避免文档与最终路径不一致。

## KISS / YAGNI / DRY / SOLID 应用

- **KISS**：只做目录分层和 imports 修复，不在迁移中重写业务逻辑。
- **YAGNI**：不引入新框架、DI 容器或完整 DDD 模板。
- **DRY**：把重复的 API client、layout、plugin navigation 派生逻辑收敛到 shared/plugin 边界。
- **SOLID**：通过 entry、application、domain、adapter 分层强化单一职责和依赖方向。
