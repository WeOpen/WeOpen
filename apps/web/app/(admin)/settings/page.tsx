import { SettingsForm } from "@/features/settings/settings-form";
import { AdminAccessPanel } from "@/features/settings/admin-access-panel";
import { AuditLogPanel } from "@/features/settings/audit-log-panel";
import { MFAPanel } from "@/features/settings/mfa-panel";
import { Card, PageHeader, StatusChip } from "@weopen/ui";

export default function SettingsPage() {
  return (
      <section className="settings-console">
        <PageHeader
          actions={<StatusChip tone="success">Live API</StatusChip>}
          eyebrow="Settings"
          title="Settings"
          description="Server-backed provider secrets, user access control, session management, and persistent audit history."
        />
        <div className="settings-console-grid">
          <div className="settings-left-column">
            <SettingsForm />
            <AdminAccessPanel />
          </div>

          <div className="settings-middle-column">
            <MFAPanel />
            <Card>
              <Card.Header><Card.Title>Security Flow</Card.Title></Card.Header>
              <Card.Content className="settings-provider-list">
                <div><span>Session</span><strong><i /> HttpOnly Cookie</strong><small>Raw tokens are not exposed to browser JavaScript.</small></div>
                <div><span>CSRF</span><strong><i /> Double Submit</strong><small>Unsafe cookie-authenticated requests require X-CSRF-Token.</small></div>
                <div><span>RBAC</span><strong><i /> Fail Closed</strong><small>Plugin mutations without explicit permission rules are denied.</small></div>
              </Card.Content>
            </Card>
          </div>

          <AuditLogPanel />
        </div>
      </section>
  );
}
