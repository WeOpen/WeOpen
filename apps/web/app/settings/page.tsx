import { AppShell } from "@/shared/layout/app-shell";
import { SettingsForm } from "@/features/settings/settings-form";
import { Card, HorizontalScrollArea, PageHeader, StatusChip } from "@weopen/ui";

const auditRows = [
  ["2025-05-20 14:36:58", "admin", "SETTINGS.UPDATE", "APP", "API BASE URL"],
  ["2025-05-20 14:36:58", "admin", "SETTINGS.UPDATE", "APP", "WEB ORIGIN"],
  ["2025-05-20 14:36:58", "admin", "SETTINGS.UPDATE", "PREFS", "THEME"],
  ["2025-05-20 14:35:41", "system", "PROVIDER.VERIFIED", "R2", "SUCCESS"],
  ["2025-05-20 14:35:41", "system", "PROVIDER.VERIFIED", "CLOUDFLARE", "SUCCESS"],
  ["2025-05-20 14:33:12", "admin", "DEVTOOLS.EXECUTE", "JSON", "FORMAT"],
  ["2025-05-20 14:32:05", "admin", "STORAGE.LIST", "R2", "BUCKETS"],
  ["2025-05-20 14:31:22", "admin", "DOMAINS.SYNC", "CLOUDFLARE", "READ ONLY"],
  ["2025-05-20 14:30:11", "admin", "API.REQUEST", "/v1/health", "200 OK"]
];

export default function SettingsPage() {
  return (
    <AppShell currentPath="/settings">
      <section className="settings-console">
        <PageHeader
          actions={<StatusChip tone="success">Saved</StatusChip>}
          eyebrow="Settings"
          title="Settings"
          description="Local mode configuration, server-side secret summaries, and read-only audit history."
        />
        <div className="settings-console-grid">
          <div className="settings-left-column">
            <SettingsForm />
            <Card className="settings-session-card">
              <Card.Header><Card.Title>Session</Card.Title></Card.Header>
              <Card.Content>
                <dl className="settings-kv-list">
                  <div><dt>Status</dt><dd><span className="settings-green-dot" /> Active</dd></div>
                  <div><dt>Last active</dt><dd>2025-05-20 14:36:58 UTC</dd></div>
                  <div><dt>Session ID</dt><dd>f4c8a9d2-3b9e-4b19-9d3f-6e9b2d7c4a11</dd></div>
                  <div><dt>Idle timeout</dt><dd>30 minutes</dd></div>
                  <div><dt>Max session time</dt><dd>8 hours</dd></div>
                </dl>
              </Card.Content>
            </Card>
          </div>

          <div className="settings-middle-column">
            <SecretCard title="R2" rows={["Access Key ID", "Secret Access Key", "Account ID", "Bucket", "Last Verified"]} />
            <SecretCard title="Cloudflare" rows={["API Token", "Account ID", "Zone Access", "Last Verified"]} />
            <Card>
              <Card.Header><Card.Title>Providers</Card.Title></Card.Header>
              <Card.Content className="settings-provider-list">
                {[["R2", "READY"], ["CLOUDFLARE", "READY"], ["API", "READY"], ["DEVTOOLS", "LOCAL ONLY"]].map(([name, status]) => (
                  <div key={name}><span>{name}</span><strong><i /> {status}</strong><small>LAST CHECK 14:35:41 UTC</small></div>
                ))}
              </Card.Content>
            </Card>
          </div>

          <Card className="settings-audit-log">
            <Card.Header>
              <Card.Title>Audit Log</Card.Title>
              <button type="button">▽ Filter</button>
            </Card.Header>
            <Card.Content>
              <HorizontalScrollArea
                className="settings-audit-scroll"
                viewportClassName="settings-audit-table"
                role="table"
                aria-label="Audit log"
              >
                <div role="row"><span>Time (UTC)</span><span>Actor</span><span>Action</span><span>Resource</span><span>Details</span></div>
                {auditRows.map((row) => (
                  <div role="row" key={row.join("-")}>{row.map((cell) => <span key={cell}>{cell}</span>)}</div>
                ))}
              </HorizontalScrollArea>
            </Card.Content>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}

function SecretCard({ rows, title }: { rows: string[]; title: string }) {
  return (
    <Card className="settings-secret-card">
      <Card.Header><Card.Title>{title}</Card.Title><StatusChip tone="success">Secret set</StatusChip></Card.Header>
      <Card.Content>
        <dl className="settings-kv-list">
          {rows.map((row, index) => (
            <div key={row}>
              <dt>{row}</dt>
              <dd>{index < 2 ? "••••••••••••••••7F3Q" : index === rows.length - 1 ? "2025-05-20 14:35:41 UTC" : "OK"}</dd>
            </div>
          ))}
        </dl>
      </Card.Content>
    </Card>
  );
}
