import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="ui-card auth-card">
        <div className="page-kicker">Login</div>
        <h1 className="page-title">Sign in to WeOpen</h1>
        <p className="page-description">Use the platform administrator account to enter the management console.</p>
        <LoginForm />
      </section>
    </main>
  );
}
