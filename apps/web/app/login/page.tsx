import { LoginForm } from "@/features/auth/login-form";
import { safeNextPath } from "@/shared/auth/routes";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawNext = Array.isArray(params?.next) ? params?.next[0] : params?.next;
  const nextPath = safeNextPath(rawNext);
  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="WeOpen system identity">
        <h1>WEOPEN</h1>
        <p>PERSONAL MANAGEMENT PLATFORM</p>
        <span>CONTROL. MANAGE. OPERATE.</span>
        <dl className="auth-system-list">
          <div><dt>System</dt><dd>WeOpen Control</dd></div>
          <div><dt>Version</dt><dd>v1.2.0</dd></div>
          <div><dt>Environment</dt><dd>Production</dd></div>
          <div><dt>Region</dt><dd>Global</dd></div>
          <div><dt>Time (UTC)</dt><dd>2025-05-20 14:37:11</dd></div>
          <div><dt>Status</dt><dd><i /> API Ready</dd></div>
          <div><dt>Mode</dt><dd><b>Local Mode</b></dd></div>
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
            <div><i /> <strong>API Ready</strong><span>Connected</span></div>
            <div><strong>◌ Local Mode</strong><span>Active</span></div>
            <div><strong>◷ Session</strong><span>No active session</span></div>
          </div>
        </div>
        <p className="auth-dev-credentials">Default dev credentials: <strong>admin@example.com / admin</strong></p>
        <p className="auth-warning"><span>●</span> Use strong passwords and keep your session private</p>
      </section>
    </main>
  );
}
