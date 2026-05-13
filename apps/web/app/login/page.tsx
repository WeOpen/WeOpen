import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div className="page-kicker">Login</div>
        <h1 className="page-title">登录 WeOpen</h1>
        <p className="page-description">使用平台管理员账号进入个人管理后台。</p>
      </section>
      <LoginForm />
    </main>
  );
}
