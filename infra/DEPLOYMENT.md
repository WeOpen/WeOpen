# Vercel Deployment

WeOpen deploys to two Vercel Hobby projects:

- `weopen-web`: Root Directory `apps/web`
- `weopen-api`: Root Directory `services/api`

The web project proxies `/api/[...path]` to the API project through server-side route handlers. The API project runs `services/api/api/index.go` as a Go serverless function and reuses the same `http.Handler` as local development.

## API Project

Use `services/api` as the Vercel root directory.

Required environment variables:

| Name | Notes |
| --- | --- |
| `APP_ENV` | Use `production` for Vercel production and `preview` for previews. |
| `APP_URL` | API project URL, for example `https://weopen-api.vercel.app`. |
| `WEB_ORIGIN` | Web project origin, for example `https://weopen-web.vercel.app`. |
| `DATABASE_URL` | Neon or Vercel Postgres connection URL. |
| `MIGRATIONS_DIR` | `migrations` on Vercel because project root is `services/api`. |
| `SESSION_SECRET` | Strong random value; required by config policy. |
| `SECRET_ENCRYPTION_KEY` | Strong random value used to encrypt provider secrets. |
| `ADMIN_EMAIL` | Initial admin email. |
| `ADMIN_PASSWORD` | Initial admin password; rotate after first login. |
| `R2_ACCOUNT_ID` | Cloudflare account ID. |
| `R2_BUCKET` | Cloudflare R2 bucket name. |
| `R2_ACCESS_KEY_ID` | R2 access key ID. |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key. |
| `CLOUDFLARE_API_TOKEN` | Optional fallback token for domains provider calls. |

## Web Project

Use `apps/web` as the Vercel root directory.

Required environment variables:

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Public API project URL. |
| `WEOPEN_API_BASE_URL` | Server-side API project URL; usually same as `NEXT_PUBLIC_API_BASE_URL`. |
| `API_INTERNAL_BASE_URL` | Optional private/internal API origin if later available. |

## Database

Recommended free providers:

- Neon Postgres
- Vercel Postgres

Migrations currently run during API handler initialization when `DATABASE_URL` is set. For production hardening, prefer running the same files in `services/api/migrations` from CI or a one-off admin job before traffic is shifted.

## Preview Checklist

- Open `/api/healthz` on the API project and confirm `200`.
- Open the web project and log in with the configured admin account.
- Confirm `/api/me` works through the web proxy.
- Toggle a plugin enabled state and refresh.
- Save an R2 secret in Settings, refresh, and confirm redacted metadata remains.
- Upload an object through the R2 storage plugin using preview R2 credentials.
- Confirm CORS allows the web project origin and rejects unrelated origins.
