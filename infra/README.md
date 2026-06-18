# infra/

部署与运维配置（Vercel 免费层）。决策见 `docs/adr/0001-vercel-go-serverless-and-restructure.md`，
执行计划见 `docs/plans/2026-06-14-vercel-restructure-and-serverless-plan.md`。

## 拓扑

- **Vercel 项目 #1 = `apps/web`**（Next.js）：UI + 插件宿主 + `/api/[...path]` 代理。
- **Vercel 项目 #2 = `services/api`**（Go serverless functions）：业务 API。
- **Neon / Vercel Postgres**（免费）：关系真相。
- **Cloudflare R2**：对象存储。
- **可选 Upstash Redis**（免费）：限流/瞬态。

## 目录

- `DEPLOYMENT.md` — Vercel 双项目拓扑、环境变量、数据库迁移和 preview checklist。
- `vercel/` — 两个 Vercel 项目的配置模板与环境变量清单。

## 状态

Vercel serverless 入口和 SQL-backed auth/session/secrets/plugin-state/rate-limit/blog/storage/domains 装配已落地。实际 preview 部署仍需要在 Vercel 控制台配置两个项目的 Root Directory 与环境变量。
