"use client";

"use client";

import { AppShell } from "@/shared/layout/app-shell";
import { Alert, Button, Card, Chip, DataTable, FileDropzone, Input, PageHeader, SelectField, StatusChip, Tabs, Textarea } from "@weopen/ui";

const componentRows = [
  { id: "1001", name: "Report.pdf", status: "ACTIVE", updatedAt: "2025-05-20 14:33:21" },
  { id: "1002", name: "Invoice.csv", status: "PENDING", updatedAt: "2025-05-20 14:28:47" },
  { id: "1003", name: "Notes.txt", status: "INACTIVE", updatedAt: "2025-05-20 14:20:11" }
];

export default function CustomUiPage() {
  return (
    <AppShell currentPath="/custom-ui">
      <section className="custom-ui-workspace">
        <div className="custom-ui-main">
          <PageHeader
            eyebrow="Design System"
            title="CUSTOM UI"
            description="No HeroUI. 100% custom React components built for WeOpen."
          />

          <div className="custom-ui-grid" aria-label="Component inventory">
            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Button</Card.Title></Card.Header>
              <Card.Content>
                <div className="custom-ui-button-grid">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
                <code>{`<Button variant="primary">PRIMARY</Button>`}</code>
              </Card.Content>
            </Card>

            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Card</Card.Title></Card.Header>
              <Card.Content>
                <Card className="custom-ui-nested-card">
                  <Card.Header>
                    <Card.Title>Card title</Card.Title>
                    <Card.Description>This card contains content and supports actions.</Card.Description>
                  </Card.Header>
                  <Card.Footer>Actions ···</Card.Footer>
                </Card>
                <code>{`<Card>...</Card>`}</code>
              </Card.Content>
            </Card>

            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Chip</Card.Title></Card.Header>
              <Card.Content>
                <div className="custom-ui-button-grid">
                  <Chip color="success">Success</Chip>
                  <Chip color="warning">Warning</Chip>
                  <Chip color="danger">Danger</Chip>
                  <Chip>Neutral</Chip>
                </div>
                <code>{`<Chip tone="success">SUCCESS</Chip>`}</code>
              </Card.Content>
            </Card>

            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Alert</Card.Title></Card.Header>
              <Card.Content>
                <div className="custom-ui-alert-stack">
                  <Alert status="success"><Alert.Content><Alert.Description>SUCCESS Operation completed.</Alert.Description></Alert.Content></Alert>
                  <Alert status="warning"><Alert.Content><Alert.Description>WARNING Check your input.</Alert.Description></Alert.Content></Alert>
                  <Alert status="danger"><Alert.Content><Alert.Description>ERROR Something went wrong.</Alert.Description></Alert.Content></Alert>
                </div>
              </Card.Content>
            </Card>

            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Tabs</Card.Title></Card.Header>
              <Card.Content>
                <Tabs selectedKey="overview">
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Preview tabs" className="custom-ui-tabs">
                      <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
                      <Tabs.Tab id="details">Details<Tabs.Indicator /></Tabs.Tab>
                      <Tabs.Tab id="settings">Settings<Tabs.Indicator /></Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                  <Tabs.Panel id="overview">Tab content goes here.</Tabs.Panel>
                </Tabs>
              </Card.Content>
            </Card>

            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Input</Card.Title></Card.Header>
              <Card.Content><Input aria-label="Input preview" placeholder="placeholder text" /></Card.Content>
            </Card>

            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Select Field</Card.Title></Card.Header>
              <Card.Content>
                <SelectField label="Select" placeholder="Select an option" onChange={() => undefined} options={[{ label: "Option A", value: "a" }]} value="" />
              </Card.Content>
            </Card>

            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Textarea</Card.Title></Card.Header>
              <Card.Content><Textarea aria-label="Textarea preview" placeholder="Multi-line input content goes here..." rows={4} /></Card.Content>
            </Card>

            <Card className="custom-ui-spec-card custom-ui-table-card">
              <Card.Header><Card.Title>DataTable</Card.Title></Card.Header>
              <Card.Content>
                <DataTable
                  aria-label="Custom UI data table"
                  columns={[
                    { id: "id", label: "ID", render: (row) => row.id },
                    { id: "name", label: "Name", render: (row) => row.name },
                    { id: "status", label: "Status", render: (row) => <StatusChip tone={row.status === "ACTIVE" ? "success" : row.status === "PENDING" ? "warning" : "neutral"}>{row.status}</StatusChip> },
                    { id: "updatedAt", label: "Updated at", render: (row) => row.updatedAt },
                    { id: "actions", label: "Actions", render: () => "···" }
                  ]}
                  getRowId={(row) => row.id}
                  rows={componentRows}
                />
              </Card.Content>
            </Card>

            <Card className="custom-ui-spec-card">
              <Card.Header><Card.Title>Dropzone</Card.Title></Card.Header>
              <Card.Content>
                <FileDropzone onFileSelect={() => undefined} title="Drag & drop files here" description="or click to browse" />
              </Card.Content>
            </Card>
          </div>
        </div>

        <aside className="custom-ui-token-panel" aria-label="Theme tokens">
          <h2>Theme Tokens</h2>
          <section>
            <h3>Colors</h3>
            {[
              ["BG", "#000000"],
              ["SURFACE", "#111111"],
              ["BORDER", "#333333"],
              ["TEXT PRIMARY", "#E8E8E8"],
              ["TEXT SECONDARY", "#999999"],
              ["ACCENT", "#D71921"],
              ["SUCCESS", "#22C55E"],
              ["WARNING", "#F59E0B"]
            ].map(([name, value]) => (
              <div className="token-row" key={name}><span>{name}</span><i style={{ background: value }} /><code>{value}</code></div>
            ))}
          </section>
          <section>
            <h3>Typography</h3>
            <div className="token-row"><span>DISPLAY</span><code>SPACE GROTESK</code></div>
            <div className="token-row"><span>BODY</span><code>SPACE GROTESK</code></div>
            <div className="token-row"><span>MONO</span><code>SPACE MONO</code></div>
            <div className="token-row"><span>DOT MATRIX</span><code>DOTO</code></div>
          </section>
          <section className="token-columns">
            <div>
              <h3>Spacing</h3>
              <p>XS 4</p><p>SM 8</p><p>MD 16</p><p>LG 24</p><p>XL 32</p>
            </div>
            <div>
              <h3>Radius</h3>
              <p>NONE 0</p><p>SM 2</p><p>MD 4</p><p>LG 8</p><p>ROUND 999</p>
            </div>
          </section>
          <section>
            <h3>Border Width</h3>
            <p>HAIRLINE 1</p><p>DEFAULT 1</p><p>THICK 2</p>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
