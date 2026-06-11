"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  Chip,
  DataTable,
  FileDropzone,
  Input,
  PageHeader,
  SelectField,
  StatusChip,
  Tabs,
  Textarea
} from "@weopen/ui";

type ComponentRow = {
  id: string;
  name: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  updatedAt: string;
};

type ComponentPreviewCardProps = {
  children: ReactNode;
  code: string;
  detail: string;
  index: string;
  title: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  wide?: boolean;
};

type ComponentSectionProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

const componentRows: ComponentRow[] = [
  { id: "1001", name: "Button", status: "ACTIVE", updatedAt: "2026-06-11 20:12:10" },
  { id: "1002", name: "DataTable", status: "ACTIVE", updatedAt: "2026-06-11 20:08:42" },
  { id: "1003", name: "Dropzone", status: "PENDING", updatedAt: "2026-06-11 19:58:31" },
  { id: "1004", name: "EmptyState", status: "INACTIVE", updatedAt: "2026-06-10 23:41:09" }
];

const tokenRows = [
  ["BG", "#000000"],
  ["SURFACE", "#111111"],
  ["BORDER", "#333333"],
  ["TEXT PRIMARY", "#E8E8E8"],
  ["TEXT SECONDARY", "#999999"],
  ["ACCENT", "#D71921"],
  ["SUCCESS", "#22C55E"],
  ["WARNING", "#F59E0B"]
];

const componentStats = [
  ["Groups", "04"],
  ["Primitives", "12"],
  ["Motion", "180ms"],
  ["Radius", "8px"]
];

export default function DesignSystemPage() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [segment, setSegment] = useState("compact");

  return (
    <main className="design-system-page" aria-label="WeOpen design system">
      <header className="design-system-nav" aria-label="Design system navigation">
        <Link className="landing-brand" href="/" aria-label="WeOpen home">
          WeOpen
        </Link>
        <div className="design-system-nav-actions">
          <Link className="landing-console-link" href="/">
            Home
          </Link>
          <Link className="landing-console-link" href="/dashboard">
            Open console
          </Link>
        </div>
      </header>

      <section className="design-system-hero">
        <div className="design-system-hero-copy">
          <PageHeader
            eyebrow="Design System"
            title="DESIGN SYSTEM"
            description="Custom React components and WeOpen theme tokens."
          />
          <div className="design-system-group-nav" aria-label="Component groups">
            {[
              ["Controls", "controls"],
              ["Forms", "forms"],
              ["Feedback", "feedback"],
              ["Data", "data-display"]
            ].map(([label, target]) => (
              <a href={`#${target}`} key={target}>
                {label}
              </a>
            ))}
          </div>
        </div>
        <dl className="design-system-stats" aria-label="Design system status">
          {componentStats.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="custom-ui-workspace">
        <div className="custom-ui-main">
          <ComponentSection
            description="Buttons, tabs, and mode selectors with precise focus and hover states."
            eyebrow="Group 01"
            title="Controls"
          >
            <ComponentPreviewCard
              code={'<Button variant="primary">Primary</Button>'}
              detail="Variants, sizes, pending state"
              index="01"
              title="Button"
              tone="accent"
              wide
            >
              <div className="custom-ui-button-grid custom-ui-button-grid-featured">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button size="sm" variant="secondary">Small</Button>
                <Button isPending variant="secondary">Pending</Button>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              code="<Tabs selectedKey={selectedTab} />"
              detail="Controlled tab selection"
              index="02"
              title="Tabs"
              tone="success"
            >
              <Tabs onSelectionChange={(key) => setSelectedTab(String(key))} selectedKey={selectedTab}>
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Preview tabs" className="custom-ui-tabs">
                    <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
                    <Tabs.Tab id="details">Details<Tabs.Indicator /></Tabs.Tab>
                    <Tabs.Tab id="settings">Settings<Tabs.Indicator /></Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel id="overview">Overview panel ready.</Tabs.Panel>
                <Tabs.Panel id="details">Details panel synced.</Tabs.Panel>
                <Tabs.Panel id="settings">Settings panel locked.</Tabs.Panel>
              </Tabs>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              code="<SegmentedControl value={mode} />"
              detail="Local page prototype"
              index="03"
              title="Segmented"
              tone="neutral"
            >
              <div className="custom-ui-segmented" role="tablist" aria-label="Density">
                {["compact", "balanced", "spacious"].map((item) => (
                  <button
                    aria-selected={segment === item}
                    className={segment === item ? "is-active" : undefined}
                    key={item}
                    onClick={() => setSegment(item)}
                    role="tab"
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className={`custom-ui-density-meter custom-ui-density-meter-${segment}`}>
                <i />
                <i />
                <i />
                <i />
              </div>
            </ComponentPreviewCard>
          </ComponentSection>

          <ComponentSection
            description="Form fields tuned for dense operational flows and clear validation."
            eyebrow="Group 02"
            title="Forms"
          >
            <ComponentPreviewCard
              code={'<Input label="Workspace" />'}
              detail="Label, placeholder, invalid copy"
              index="04"
              title="Input"
              tone="success"
            >
              <div className="custom-ui-field-stack">
                <Input label="Workspace" placeholder="weopen-core" />
                <Input errorMessage="Required field" isInvalid label="Slug" placeholder="project-slug" />
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              code="<SelectField options={options} />"
              detail="Native select with token styling"
              index="05"
              title="Select Field"
              tone="neutral"
            >
              <SelectField
                label="Environment"
                onChange={() => undefined}
                options={[
                  { label: "Local", value: "local" },
                  { label: "Preview", value: "preview" },
                  { label: "Production", value: "production", disabled: true }
                ]}
                placeholder="Select an option"
                value=""
              />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              code="<Textarea rows={4} />"
              detail="Resize, focus, overflow"
              index="06"
              title="Textarea"
              tone="neutral"
            >
              <Textarea aria-label="Textarea preview" placeholder="Multi-line input content goes here..." rows={4} />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              code={'<FileDropzone title="Drop files" />'}
              detail="Drag, active, disabled"
              index="07"
              title="Dropzone"
              tone="warning"
              wide
            >
              <FileDropzone
                buttonLabel="Browse"
                description="PNG, JPG, SVG, WEBP"
                onFileSelect={() => undefined}
                title="Drop interface assets"
              />
            </ComponentPreviewCard>
          </ComponentSection>

          <ComponentSection
            description="Inline status, color-coded values, and interrupt states."
            eyebrow="Group 03"
            title="Feedback"
          >
            <ComponentPreviewCard
              code={'<StatusChip tone="success">Ready</StatusChip>'}
              detail="Dot, tone, compact label"
              index="08"
              title="Status Chip"
              tone="success"
            >
              <div className="custom-ui-chip-matrix">
                <StatusChip tone="success">Ready</StatusChip>
                <StatusChip tone="warning">Review</StatusChip>
                <StatusChip tone="danger">Blocked</StatusChip>
                <StatusChip>Idle</StatusChip>
                <Chip color="accent">Accent</Chip>
                <Chip>Neutral</Chip>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              code={'<Alert status="danger">...</Alert>'}
              detail="Success, warning, danger"
              index="09"
              title="Alert"
              tone="danger"
              wide
            >
              <div className="custom-ui-alert-stack">
                <Alert status="success"><Alert.Content><Alert.Description>SUCCESS Operation completed.</Alert.Description></Alert.Content></Alert>
                <Alert status="warning"><Alert.Content><Alert.Description>WARNING Check your input.</Alert.Description></Alert.Content></Alert>
                <Alert status="danger"><Alert.Content><Alert.Description>ERROR Something went wrong.</Alert.Description></Alert.Content></Alert>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              code="<ProgressRail value={72} />"
              detail="Local page prototype"
              index="10"
              title="Progress Rail"
              tone="accent"
            >
              <div className="custom-ui-progress-stack">
                <div><span>Build</span><i style={{ "--value": "82%" } as CSSProperties} /></div>
                <div><span>Audit</span><i style={{ "--value": "64%" } as CSSProperties} /></div>
                <div><span>Ship</span><i style={{ "--value": "38%" } as CSSProperties} /></div>
              </div>
            </ComponentPreviewCard>
          </ComponentSection>

          <ComponentSection
            description="Cards, tables, and compact metadata surfaces for repeated scanning."
            eyebrow="Group 04"
            title="Data Display"
          >
            <ComponentPreviewCard
              code="<Card><Card.Header />...</Card>"
              detail="Header, content, footer"
              index="11"
              title="Card"
              tone="neutral"
            >
              <Card className="custom-ui-nested-card">
                <Card.Header>
                  <Card.Title>Card title</Card.Title>
                  <Card.Description>This card contains content and supports actions.</Card.Description>
                </Card.Header>
                <Card.Footer>Actions ...</Card.Footer>
              </Card>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              code="<DataTable rows={rows} columns={columns} />"
              detail="Horizontal scroll, status cells"
              index="12"
              title="DataTable"
              tone="success"
              wide
            >
              <DataTable
                aria-label="Custom UI data table"
                columns={[
                  { id: "id", label: "ID", render: (row) => row.id },
                  { id: "name", label: "Name", isRowHeader: true, render: (row) => row.name },
                  { id: "status", label: "Status", render: (row) => <StatusChip tone={statusTone(row.status)}>{row.status}</StatusChip> },
                  { id: "updatedAt", label: "Updated at", render: (row) => row.updatedAt },
                  { id: "actions", label: "Actions", render: () => "..." }
                ]}
                getRowId={(row) => row.id}
                minWidth={680}
                rows={componentRows}
              />
            </ComponentPreviewCard>
          </ComponentSection>
        </div>

        <aside className="custom-ui-token-panel" aria-label="Theme tokens">
          <section className="custom-ui-token-instrument">
            <h2>Theme Tokens</h2>
            <div className="custom-ui-token-gauge" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
          <section>
            <h3>Colors</h3>
            {tokenRows.map(([name, value]) => (
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
            <h3>Motion</h3>
            <p>HOVER 180MS</p><p>ENTRY 360MS</p><p>EASE OUT</p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function ComponentSection({ children, description, eyebrow, title }: ComponentSectionProps) {
  return (
    <section className="custom-ui-component-section" id={title.toLowerCase().replace(/\s+/g, "-")}>
      <div className="custom-ui-section-header">
        <span>{eyebrow}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="custom-ui-grid" aria-label={`${title} components`}>
        {children}
      </div>
    </section>
  );
}

function ComponentPreviewCard({ children, code, detail, index, title, tone = "neutral", wide }: ComponentPreviewCardProps) {
  return (
    <Card className={`custom-ui-spec-card custom-ui-component-card${wide ? " custom-ui-component-card-wide" : ""}`}>
      <Card.Header>
        <div className="custom-ui-card-title-row">
          <Card.Title>{title}</Card.Title>
          <StatusChip tone={tone}>{index}</StatusChip>
        </div>
        <p className="custom-ui-card-detail">{detail}</p>
      </Card.Header>
      <Card.Content>
        <div className="custom-ui-preview-surface">
          {children}
        </div>
        <code>{code}</code>
      </Card.Content>
    </Card>
  );
}

function statusTone(status: ComponentRow["status"]) {
  if (status === "ACTIVE") {
    return "success";
  }
  if (status === "PENDING") {
    return "warning";
  }
  return "neutral";
}
