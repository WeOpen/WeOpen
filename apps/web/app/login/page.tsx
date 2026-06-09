import { LoginForm } from "@/features/auth/login-form";
import { builtinPluginManifests } from "@/plugins";
import { backendApiUrl } from "@/shared/api/server-base";
import { safeNextPath } from "@/shared/auth/routes";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string | string[] }>;
};

type LoginSystemStatus = {
  environment: string;
  region: string;
  checkedAt: string;
  apiLabel: string;
  apiDetail: string;
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
      <section className="auth-brand-panel" aria-label="WeOpen system identity">
        <h1>WEOPEN</h1>
        <p>PERSONAL MANAGEMENT PLATFORM</p>
        <span>CONTROL. MANAGE. OPERATE.</span>
        <dl className="auth-system-list">
          <div><dt>System</dt><dd>WeOpen Control</dd></div>
          <div><dt>Version</dt><dd>v{platformVersion}</dd></div>
          <div><dt>Environment</dt><dd>{systemStatus.environment}</dd></div>
          <div><dt>Region</dt><dd>{systemStatus.region}</dd></div>
          <div><dt>Checked (UTC)</dt><dd>{systemStatus.checkedAt}</dd></div>
          <div><dt>Status</dt><dd><i /> {systemStatus.apiLabel}</dd></div>
          <div><dt>Mode</dt><dd><b>{systemStatus.mode}</b></dd></div>
        </dl>
      </section>

      <section className="auth-access-panel" aria-label="Admin access">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Admin Access</h2>
            <p>Authorized personnel only</p>
          </div>
          <LoginForm nextPath={nextPath} />
          <div className="auth-session-strip">
            <div><i /> <strong>{systemStatus.apiLabel}</strong><span>{systemStatus.apiDetail}</span></div>
            <div><strong>◌ {systemStatus.mode}</strong><span>{systemStatus.environment}</span></div>
            <div><strong>◷ Session</strong><span>Awaiting credentials</span></div>
          </div>
        </div>
        {showLocalCredentialHint ? (
          <p className="auth-dev-credentials">Local credentials are read from <strong>ADMIN_EMAIL / ADMIN_PASSWORD</strong> in your API environment.</p>
        ) : null}
        <p className="auth-warning"><span>●</span> Use strong passwords and keep your session private</p>
      </section>
    </main>
  );
}

async function loadLoginSystemStatus(): Promise<LoginSystemStatus> {
  const checkedAt = formatUTC(new Date());
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
        checkedAt,
        apiLabel: "API Unavailable",
        apiDetail: `Health check ${response.status}`,
        mode
      };
    }
    const health = (await response.json()) as { status?: string; service?: string };
    return {
      environment,
      region,
      checkedAt,
      apiLabel: health.status === "ok" ? "API Ready" : "API Degraded",
      apiDetail: health.service ?? "weopen-api",
      mode
    };
  } catch {
    return {
      environment,
      region,
      checkedAt,
      apiLabel: "API Offline",
      apiDetail: "Health check failed",
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

function formatUTC(date: Date): string {
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}
