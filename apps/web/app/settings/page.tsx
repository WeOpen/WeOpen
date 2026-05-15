import { AppShell } from "@/shared/layout/app-shell";
import { SettingsForm } from "@/features/settings/settings-form";

export default function SettingsPage() {
  return (
    <AppShell currentPath="/settings">
      <section className="page-header">
        <div className="page-kicker">Settings</div>
        <h1 className="page-title">Settings center</h1>
        <p className="page-description">
          Configure external service secrets. The server returns masked summaries only and never sends raw secret values back to the browser.
        </p>
      </section>
      <SettingsForm />
    </AppShell>
  );
}
