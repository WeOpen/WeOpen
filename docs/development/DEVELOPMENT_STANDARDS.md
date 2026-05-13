# WeOpen 开发规范

版本：v0.1  
日期：2026-05-13  
适用范围：WeOpen 个人管理平台全部 Web、API、Desktop、插件、文档和部署工作  
规范级别：必须遵守

## 1. 规范目标

本规范用于统一后续开发方式，避免项目在功能扩展、插件增多、多端复用和部署迁移过程中失控。

所有后续开发必须满足：

- 可读：新人能通过目录、命名、测试和文档理解代码。
- 可测：关键行为有自动化验证，不能只靠手工试。
- 可回滚：变更小、提交清晰、风险明确。
- 可部署：配置、密钥、构建和环境边界明确。
- 可扩展：平台能力和插件能力边界清晰。
- 安全：密钥、权限、输入、日志和外部 API 调用默认保守。

## 2. 参考标准

本规范结合以下主流工程实践，并按 WeOpen 项目实际约束裁剪：

- Google Engineering Practices：代码评审关注设计、功能、复杂度、测试、命名、注释和一致性。
- Conventional Commits：提交信息使用机器和人都能理解的结构化格式。
- Semantic Versioning：公开 API、插件协议和包版本按兼容性表达变化。
- Twelve-Factor App：配置来自环境，依赖显式声明，日志交给运行环境聚合。
- NIST SSDF：软件开发要覆盖准备、保护、生产良好安全软件和漏洞响应。
- OWASP Top 10 / ASVS 思路：安全不能只靠上线前扫描，设计和编码阶段就要控制风险。
- OpenAPI：HTTP API 必须有可读、可生成客户端的接口描述。
- Go、TypeScript、React、Next.js 官方实践：格式化、类型、Hooks、环境变量和生产检查按官方约束执行。

## 3. 规范优先级

当规则冲突时，按以下顺序处理：

1. 用户最新明确要求。
2. 仓库根目录 `AGENTS.md` 或会话中等效的仓库级指令。
3. 本文档。
4. `PLAN.md`、PRD、设计文档。
5. 局部代码风格和已有实现。

如果技术约束与产品目标冲突，必须先记录冲突，再选择最小可行方案，不能假装两者都能满足。

## 4. 工作流程

### 4.1 开始前

每次开发前必须：

1. 运行 `git status --short`，确认当前工作区状态。
2. 阅读相关 PRD、设计文档、`PLAN.md` 或 issue。
3. 明确本次变更的目标、非目标、影响范围和验收方式。
4. 如果涉及外部 SDK、平台、框架或部署能力，优先查官方文档。
5. 如果已有用户未提交改动，不得覆盖、删除或回滚。

### 4.2 任务拆分

任务必须按可验证的小步推进：

- 一个任务只解决一个明确目标。
- 跨 Web/API/Desktop/插件的变更要按垂直切片拆分。
- 公共抽象只在重复出现且边界稳定后提取。
- 禁止为了“以后可能用到”提前做复杂框架。

### 4.3 开发顺序

推荐顺序：

1. 写或更新需求/设计/计划。
2. 写测试或最小验证用例。
3. 实现最小功能。
4. 运行目标验证。
5. 补充文档。
6. 做一次自查。
7. 提交。

行为变化、修 bug、插件能力、权限和安全逻辑必须优先有测试或明确验证脚本。

## 5. Git 与提交规范

### 5.1 分支

- 功能分支默认使用 `codex/<short-topic>`。
- `main` 必须保持可构建、可部署。
- 不在 `main` 上直接进行大功能开发。
- 不提交本地临时文件、构建缓存、密钥或机器私有配置。

### 5.2 提交粒度

一个提交应满足：

- 能独立解释为什么要改。
- 尽量能独立通过相关验证。
- 不混合无关重构、格式化和功能变更。
- 文档、测试、实现尽量在同一行为变更提交内闭环。

### 5.3 提交信息

本项目采用仓库既定 Lore Commit Protocol。提交首行写“为什么”，不是重复“改了什么”。

推荐结构：

```text
Make plugin registration deterministic

The platform needs predictable plugin ordering so Web navigation,
dashboard widgets, and API manifests stay stable across builds.

Constraint: v1 plugins are compile-time built-ins
Rejected: Runtime plugin loading | unsafe and unnecessary for v1
Confidence: high
Scope-risk: narrow
Tested: go test ./internal/core/plugin
Not-tested: Third-party plugin packages
```

允许使用 Conventional Commits 的类型词辅助归类，例如 `feat:`, `fix:`, `docs:`, `test:`, `refactor:`，但不得替代 Lore trailers。若两者同时使用，首行仍必须表达意图。

## 6. 代码评审标准

所有 PR 或自查都按以下顺序看：

1. 设计：边界是否正确，是否符合 PRD/设计文档。
2. 功能：是否满足用户目标，边缘情况是否处理。
3. 复杂度：是否可以更简单，是否过度抽象。
4. 测试：是否覆盖关键行为和失败路径。
5. 安全：认证、权限、密钥、输入、输出、日志是否安全。
6. 可维护性：命名、目录、错误处理、文档是否清晰。
7. 一致性：是否遵循已有项目模式。

评审结论必须优先列风险和阻塞问题，不能只给泛泛建议。

## 7. TypeScript / React / Next.js 规范

### 7.1 TypeScript

- 必须开启并保持 `strict`。
- 禁止隐式 `any`。
- 显式 `any` 只能用于第三方边界、迁移过渡或无法表达的泛型，并必须收窄作用域。
- DTO、API response、插件 manifest、设置 schema 必须有明确类型。
- 跨包共享类型放入 `packages/*`，不要在 app 内复制。

### 7.2 React

- 组件和 Hooks 必须遵守 React Rules of Hooks。
- 组件渲染阶段保持纯净，不在 render 中执行请求、写存储、修改全局状态或触发副作用。
- 副作用放在事件处理、server action、route handler、或明确的 effect 中。
- 组件按职责拆分：页面编排、业务容器、纯展示组件分开。
- 表单必须有加载、成功、失败和校验状态。

### 7.3 Next.js

- `NEXT_PUBLIC_*` 只能放真正允许暴露给浏览器的值。
- 数据库连接、R2 secret、Cloudflare token、session secret 不得进入前端 bundle。
- 页面默认优先 server-safe 设计，客户端组件只在交互需要时使用。
- 生产构建前必须跑 `pnpm --filter @weopen/web build`。
- 路由、布局、加载态、错误态必须在用户路径上可理解。

### 7.4 UI

- 平台操作型界面保持克制、清晰、可扫描。
- 共享基础组件优先放 `packages/ui`。
- 不为单个页面引入新 UI 框架。
- 表格、表单、危险操作、空状态、错误状态必须一致。
- 危险操作必须有确认文案，不允许只有图标按钮。

## 8. Go API 规范

### 8.1 结构

Go API 按以下层次组织：

```text
handler -> validation -> service -> repository/provider
```

要求：

- handler 只处理 HTTP、认证上下文、请求/响应映射。
- service 承载业务规则。
- repository 只负责数据访问。
- provider 只封装外部服务。
- 不把 Cloudflare、R2、Vercel SDK 调用散落在业务代码里。

### 8.2 Go 风格

- Go 代码必须使用 `gofmt`。
- 错误必须带上下文，但不得泄露密钥。
- context 必须从请求入口向下传递。
- handler 必须返回统一 JSON 错误结构。
- serverless 路径不得依赖内存状态、常驻 goroutine 或本地磁盘持久化。

### 8.3 测试

以下逻辑必须测试：

- handler 响应码和错误结构。
- 权限判断。
- secret 加密、脱敏和读取限制。
- 插件启停。
- 数据迁移。
- 外部 provider 的成功和失败路径。

Go 验证命令：

```powershell
pnpm test:go
go test ./apps/desktop/...
```

如后续增加 Go 模块，必须同步更新根脚本，不能要求开发者记忆特殊路径。

## 9. API 规范

### 9.1 REST 与 OpenAPI

- HTTP API 必须维护 OpenAPI 描述。
- 前端 SDK 从 OpenAPI 生成或与 OpenAPI 保持同步。
- API 路径使用资源名词，不使用随意动词。
- 插件 API 统一挂在 `/api/plugins/{pluginId}/*`。
- 破坏性 API 变化必须更新 OpenAPI、SDK、调用方和迁移说明。

### 9.2 响应格式

成功响应保持稳定 JSON。

错误响应统一：

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "请求参数无效",
    "requestId": "req_..."
  }
}
```

要求：

- 不向前端返回原始 panic、堆栈或第三方完整错误。
- 错误码稳定，可用于 UI 分支和测试断言。
- 写操作必须记录审计日志。

### 9.3 幂等与分页

- 列表接口必须预留分页。
- 同步类接口必须可重复调用。
- 删除、替换、批量操作必须有确认和审计。
- 外部服务写操作必须先显示 diff，再执行。

## 10. 插件开发规范

### 10.1 插件边界

v1 插件是编译期内置插件，不做远程动态安装。

每个插件必须声明：

- `id`
- `name`
- `version`
- `permissions`
- `navigation`
- `settings`
- `dashboard widgets`
- API namespace
- 数据迁移

### 10.2 插件目录

后端插件：

```text
internal/plugins/<plugin-id>/
  plugin.go
  service.go
  repository.go
  http.go
  *_test.go
```

前端插件：

```text
apps/web/src/plugins/<plugin-id>/
  index.tsx
  <feature-page>.tsx
  components/
```

### 10.3 插件规则

- 插件不得直接读取其他插件数据库表，必须通过平台服务或明确接口。
- 插件不得直接读取 secret 原文，必须通过受控 provider。
- 插件禁用后，导航、Dashboard widget、插件 API 都必须不可用。
- 插件配置必须可导出、可迁移、可审计。
- 插件权限新增必须更新本文档或插件开发说明。

## 11. 数据库与迁移规范

- 所有 schema 变化必须写迁移。
- 迁移文件必须成对提供 up/down，除非明确不可逆并写明原因。
- 不允许手工修改生产数据作为功能实现的一部分。
- 不允许把外部 API 缓存当作唯一事实来源。
- JSON 字段只存扩展配置；高频查询字段必须拆列。
- 删除数据优先软删除或审计，除非产品明确要求硬删除。

## 12. 安全规范

### 12.1 密钥

- 密钥不得提交到仓库。
- `.env.local` 和 `.env.*.local` 必须忽略。
- 生产密钥只存在部署平台或 secrets manager。
- Secret 存数据库时必须加密。
- 前端只展示脱敏信息，例如 provider、name、last4。
- 禁止把密钥放入 `NEXT_PUBLIC_*`。

### 12.2 认证与权限

- 默认拒绝，显式允许。
- 所有 `/api/*` 非公开接口必须鉴权。
- 插件权限必须在服务端校验，不能只靠前端隐藏。
- 高风险操作必须二次确认。

### 12.3 输入输出

- 所有 API 输入必须校验。
- Markdown 渲染必须防 XSS。
- URL、文件类型、文件大小必须校验。
- 日志中不得包含 token、cookie、authorization header、R2 secret、数据库 URL。

### 12.4 外部服务

- Cloudflare、R2、Vercel token 必须最小权限。
- 域名/DNS v1 默认只读。
- 外部 API 失败必须返回可理解的错误码。
- 重试必须有限制，不能无限循环。

## 13. 测试规范

### 13.1 测试金字塔

优先级：

1. 纯函数单元测试。
2. service/repository 测试。
3. handler/API 测试。
4. 组件和交互测试。
5. 关键路径 E2E smoke test。

### 13.2 必测场景

- 登录、会话过期、退出。
- 插件注册、启用、禁用。
- secret 加密、脱敏、删除。
- Blog 创建、编辑、发布。
- R2 上传 URL、对象索引、删除。
- 域名同步失败、token 权限不足。
- 开发者工具的输入错误。

### 13.3 最低验证命令

普通代码变更至少运行相关子集：

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:go
```

涉及 Web 构建：

```powershell
pnpm --filter @weopen/web build
```

涉及桌面端：

```powershell
pnpm --filter @weopen/desktop build
go test ./apps/desktop/...
```

涉及全局交付：

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:go
go test ./apps/desktop/...
```

如果某项无法运行，最终报告必须说明原因、影响和替代验证。

## 14. 配置与部署规范

- 配置来自环境变量，不写死到代码。
- `.env.example` 必须随新增配置同步更新。
- Web 和 API 分开部署时必须显式配置 CORS、API base URL 和 cookie/session 策略。
- Vercel 环境变量按 Production、Preview、Development 分开。
- 构建产物不得依赖本机绝对路径。
- 日志输出到 stdout/stderr，由部署平台采集。
- Serverless API 不做长任务；长任务必须拆分或交给外部调度。

## 15. 文档规范

以下变更必须更新文档：

- 新插件。
- 新环境变量。
- 新外部 provider。
- API 破坏性变化。
- 数据库迁移或备份策略变化。
- 部署步骤变化。
- 安全策略变化。

文档位置：

- 产品需求：`docs/PRD-*.md`
- 技术设计：`docs/DESIGN-*.md`
- 开发计划：`PLAN.md`
- 开发规范：`docs/development/DEVELOPMENT_STANDARDS.md`
- 部署文档：`docs/deployment/`
- 安全文档：`docs/security/`

## 16. 性能与可维护性

- 默认先做清晰正确，再做性能优化。
- 性能优化必须有指标或可复现实验。
- 列表接口必须考虑分页。
- Dashboard 不得阻塞等待所有插件慢接口完成。
- 前端大组件要拆分，但不要过早引入复杂状态管理。
- Go provider 调用必须设置超时。
- R2 上传优先直传，不通过 API 转发大文件。

## 17. AI / Agent 开发规范

使用 AI 或代理开发时必须：

- 先读真实文件，不能凭印象改。
- 改动前说明将修改什么。
- 不覆盖用户未提交改动。
- 不创建无关重构。
- 不把生成物、缓存、密钥提交。
- 完成后运行验证并报告结果。
- 若使用外部资料，最终报告给出来源链接。

AI 生成代码必须接受和人工代码一样的测试、审查和提交要求。

## 18. 每次交付清单

提交或交付前检查：

- [ ] 目标和非目标清楚。
- [ ] 相关代码、测试、文档已同步。
- [ ] 没有密钥、缓存、机器本地文件。
- [ ] 错误处理和空状态可理解。
- [ ] 高风险操作有确认和审计。
- [ ] 运行了匹配变更范围的验证命令。
- [ ] 最终说明包含变更、验证、风险。
- [ ] 提交信息符合 Lore Commit Protocol。

## 19. 当前项目默认命令

```powershell
pnpm install
pnpm dev:web
pnpm dev:api
pnpm dev:desktop
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:go
go test ./apps/desktop/...
```

## 20. 参考链接

- Google Engineering Practices - Code Review: https://google.github.io/eng-practices/review/
- Conventional Commits 1.0.0: https://www.conventionalcommits.org/en/v1.0.0/
- Semantic Versioning 2.0.0: https://semver.org/
- The Twelve-Factor App: https://12factor.net/
- NIST SSDF SP 800-218: https://csrc.nist.gov/pubs/sp/800/218/final
- OWASP Top 10: https://owasp.org/Top10/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OpenAPI Specification: https://spec.openapis.org/oas/
- Go gofmt: https://go.dev/cmd/gofmt/
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/2/basic-types.html
- React Rules: https://react.dev/reference/rules
- Next.js Production Checklist: https://nextjs.org/docs/app/guides/production-checklist
- Vercel Environment Variables: https://vercel.com/docs/projects/environment-variables

