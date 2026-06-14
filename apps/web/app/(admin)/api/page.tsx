import { Card, MetricCard, PageHeader, PixelIcon, StatusChip } from "@weopen/ui";

const apiRoutes = [
  ["/healthz", "PUBLIC", "200 OK"],
  ["/api/auth/login", "PUBLIC", "READY"],
  ["/api/plugins", "AUTH", "READY"],
  ["/api/plugins/blog/*", "AUTH", "READY"],
  ["/api/plugins/storage-r2/*", "AUTH", "READY"]
];

export default function ApiPage() {
  return (
      <section className="api-workspace">
        <PageHeader eyebrow="API" title="Go API" description="HTTP service boundary for auth, settings, audit logs, plugin metadata and authenticated plugin routes." />
        <div className="storage-stats">
          <MetricCard icon={<PixelIcon name="service" />} label="Service" value="ONLINE" description="Go HTTP API" trend="live" trendDirection="up" />
          <MetricCard icon={<PixelIcon name="auth" />} label="Session" value="COOKIE" description="HttpOnly auth boundary" />
          <MetricCard icon={<PixelIcon name="routes" />} label="Plugin routes" value="4" description="Mounted behind auth" />
          <MetricCard icon={<PixelIcon name="header" />} label="Actor header" value="READY" description="X-WeOpen-Actor-ID" />
        </div>
        <Card className="api-route-panel">
          <Card.Header><Card.Title>Route Map</Card.Title></Card.Header>
          <Card.Content>
            <div className="api-route-list">
              {apiRoutes.map(([path, access, status]) => (
                <div className="api-route-row" key={path}>
                  <code>{path}</code>
                  <span>{access}</span>
                  <StatusChip tone={status === "200 OK" ? "success" : "neutral"}>{status}</StatusChip>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </section>
  );
}
