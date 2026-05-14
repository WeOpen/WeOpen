import { AppShell } from "@/shared/layout/app-shell";
import { SettingsForm } from "@/features/settings/settings-form";

export default function SettingsPage() {
  return (
    <AppShell>
      <section className="page-header">
        <div className="page-kicker">Settings</div>
        <h1 className="page-title">设置中心</h1>
        <p className="page-description">
          配置外部服务密钥。服务端只返回脱敏摘要，原始密钥不会回传到前端。
        </p>
      </section>
      <SettingsForm />
    </AppShell>
  );
}
