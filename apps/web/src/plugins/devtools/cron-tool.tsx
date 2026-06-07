import { Card, StatusChip } from "@weopen/ui";

export function CronTool() {
  return (
    <section className="tool-panel" aria-labelledby="cron-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="cron-tool-heading">Cron parser</h2>
          <p>Deferred for v1 because a reliable cron parser would require approving a new dependency.</p>
        </div>
        <StatusChip tone="warning">Deferred</StatusChip>
      </div>
      <Card className="tool-card">
        <Card.Header>
          <Card.Title>No dependency approved yet</Card.Title>
        </Card.Header>
        <Card.Content>
        <p className="tool-note">
          The workspace rule says not to add dependencies without an explicit decision. This slot documents the
          deferral while the other client-safe tools remain usable.
        </p>
        </Card.Content>
      </Card>
    </section>
  );
}
