import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";
import { LoginCheckedTime } from "@/features/auth/login-checked-time";
import { builtinPluginManifests } from "@/plugins";
import { backendApiUrl } from "@/shared/api/server-base";
import { safeNextPath } from "@/shared/auth/routes";
import { Card, PixelIcon, WeOpenWordmark } from "@weopen/ui";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string | string[] }>;
};

type LoginSystemStatus = {
  environment: string;
  region: string;
  apiLabel: string;
  apiDetail: string;
  apiTone: "success" | "danger";
  mode: string;
};

const platformVersion = builtinPluginManifests[0]?.version ?? "unknown";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [params, systemStatus] = await Promise.all([searchParams, loadLoginSystemStatus()]);
  const rawNext = Array.isArray(params?.next) ? params?.next[0] : params?.next;
  const nextPath = safeNextPath(rawNext);
  const showLocalCredentialHint = shouldShowLocalCredentialHint();

  return (
    <main className="auth-page">
      <nav className="auth-quick-links" aria-label="Public navigation">
        <Link className="landing-console-link auth-quick-link" href="/">
          HOME
        </Link>
        <Link className="landing-console-link auth-quick-link" href="/design-system">
          DESIGN SYSTEM
        </Link>
      </nav>

      <section className="auth-brand-panel" aria-label="WeOpen system identity">
        <h1 className="auth-brand-wordmark" aria-label="WeOpen">
          <WeOpenWordmark className="auth-brand-wordmark-mark" />
        </h1>
        <p>PERSONAL MANAGEMENT PLATFORM</p>
        <span>CONTROL. MANAGE. OPERATE.</span>
        <dl className="auth-system-list">
          <div><dt>System</dt><dd>WeOpen</dd></div>
          <div><dt>Version</dt><dd>v{platformVersion}</dd></div>
          <div><dt>Environment</dt><dd>{systemStatus.environment}</dd></div>
          <div><dt>Region</dt><dd>{systemStatus.region}</dd></div>
          <div><dt>Checked</dt><dd><LoginCheckedTime /></dd></div>
          <div>
            <dt>Status</dt>
            <dd className="auth-system-status">
              <i className={`auth-system-status-dot auth-system-status-dot-${systemStatus.apiTone}`} />
              {systemStatus.apiLabel}
            </dd>
          </div>
          <div><dt>Mode</dt><dd><b>{systemStatus.mode}</b></dd></div>
        </dl>
      </section>

      <section className="auth-access-panel" aria-label="Admin access">
        <Card className="auth-card">
          <div className="auth-card-header">
            <h2>Admin Access</h2>
            <p>Authorized personnel only</p>
          </div>
          <LoginForm nextPath={nextPath} />
        </Card>
        {showLocalCredentialHint ? (
          <p className="auth-dev-credentials">Local credentials are read from <strong>ADMIN_EMAIL / ADMIN_PASSWORD</strong> in your API environment.</p>
        ) : null}
        <p className="auth-warning"><PixelIcon name="warning" variant="bare" /> Use strong passwords and keep your session private</p>
      </section>
    </main>
  );
}

async function loadLoginSystemStatus(): Promise<LoginSystemStatus> {
  const environment = environmentLabel();
  const region = deploymentRegion();
  const mode = isLocalEnvironment() ? "Local Mode" : "Production Mode";

  try {
    const response = await fetch(backendApiUrl("/healthz"), {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) {
      return {
        environment,
        region,
        apiLabel: "API Unavailable",
        apiDetail: `Health check ${response.status}`,
        apiTone: "danger",
        mode
      };
    }
    const health = (await response.json()) as { status?: string; service?: string };
    const isReady = health.status === "ok";
    return {
      environment,
      region,
      apiLabel: isReady ? "API Ready" : "API Degraded",
      apiDetail: health.service ?? "weopen-api",
      apiTone: isReady ? "success" : "danger",
      mode
    };
  } catch {
    return {
      environment,
      region,
      apiLabel: "API Offline",
      apiDetail: "Health check failed",
      apiTone: "danger",
      mode
    };
  }
}

function shouldShowLocalCredentialHint(): boolean {
  return isLocalEnvironment() && process.env.NEXT_PUBLIC_SHOW_DEV_CREDENTIALS === "true";
}

function isLocalEnvironment(): boolean {
  const env = (process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? "local").toLowerCase();
  return env === "local" || env === "development";
}

function environmentLabel(): string {
  return (process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? "local").toUpperCase();
}

function deploymentRegion(): string {
  return process.env.VERCEL_REGION ?? process.env.NEXT_PUBLIC_DEPLOY_REGION ?? "local";
}
