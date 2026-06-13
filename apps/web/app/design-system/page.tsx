"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Alert,
  AvatarStack,
  Badge,
  BorderBeam,
  Button,
  Card,
  Checkbox,
  Chip,
  CommandSurface,
  ConfirmActionDialog,
  createToastRecord,
  DataTable,
  dismissToastRecord,
  EmptyState,
  FileDropzone,
  Input,
  KeyboardShortcut,
  MarqueeRail,
  MetricCard,
  PageHeader,
  PixelIcon,
  ProgressRail,
  pushToastRecord,
  Radio,
  ScrollRail,
  SelectField,
  SegmentedControl,
  Separator,
  StatusChip,
  Switch,
  Tabs,
  Textarea,
  ThemeToggle,
  ToastViewport,
  Tooltip,
  type ToastRecord
} from "@weopen/ui";

type ComponentRow = {
  id: string;
  name: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  updatedAt: string;
};

type ComponentPreviewCardProps = {
  api: Array<[string, string]>;
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
  ["Groups", "06"],
  ["Primitives", "28"],
  ["Motion", "180ms"],
  ["Radius", "8px"]
];

export default function DesignSystemPage() {
  const pageRef = useRef<HTMLElement>(null);
  const tokenPanelRef = useRef<HTMLElement>(null);
  const tokenPanelShellRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);
  const [deliveryMode, setDeliveryMode] = useState("realtime");
  const [environment, setEnvironment] = useState("preview");
  const [enabledEnvironments, setEnabledEnvironments] = useState(["local", "preview"]);
  const [metricsEnabled, setMetricsEnabled] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [segment, setSegment] = useState("compact");
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  useEffect(() => {
    const scrollToHash = () => {
      const target = decodeURIComponent(window.location.hash.slice(1));

      if (!target) {
        return;
      }

      window.requestAnimationFrame(() => {
        scrollDesignSystemGroup(pageRef.current, target, "auto");
      });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);

    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    let frame = 0;

    const updateTokenPanelHeight = () => {
      const shell = tokenPanelShellRef.current;

      if (!shell) {
        return;
      }

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const shellTop = Math.max(0, shell.getBoundingClientRect().top);
      const maxHeight = Math.max(320, viewportHeight - shellTop - 18);

      shell.style.setProperty("--design-system-token-panel-max-height", `${Math.round(maxHeight)}px`);
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateTokenPanelHeight);
    };

    scheduleUpdate();
    page?.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      page?.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  function showPreviewToast() {
    toastIdRef.current += 1;
    const nextToast = createToastRecord({
      description: "Component registry synced with the preview surface.",
      title: "Design token saved",
      tone: "success"
    }, toastIdRef.current);

    setToasts((currentToasts) => pushToastRecord(currentToasts, nextToast, 3));
  }

  return (
    <main className="design-system-page" aria-label="WeOpen design system" ref={pageRef}>
      <ToastViewport
        onDismiss={(id) => setToasts((currentToasts) => dismissToastRecord(currentToasts, id))}
        toasts={toasts}
      />
      <ScrollRail className="design-system-scroll-rail" containerRef={pageRef} />
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
              ["Data", "data-display"],
              ["Overlay", "overlay-navigation"],
              ["Motion", "motion-effects"]
            ].map(([label, target]) => (
              <a
                href={`#${target}`}
                key={target}
                onClick={(event) => {
                  event.preventDefault();
                  window.history.pushState(null, "", `#${target}`);
                  scrollDesignSystemGroup(pageRef.current, target, "smooth");
                }}
              >
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

      <section className="design-system-workspace">
        <div className="design-system-main">
          <ComponentSection
            description="Buttons, tabs, and mode selectors with precise focus and hover states."
            eyebrow="Group 01"
            title="Controls"
          >
            <ComponentPreviewCard
              api={[
                ["variant", "primary | secondary | ghost | danger"],
                ["size", "sm | md | lg | icon"],
                ["isPending", "Shows mechanical pending state"]
              ]}
              code={'<Button variant="primary">Primary</Button>'}
              detail="Variants, sizes, pending state"
              index="01"
              title="Button"
              tone="accent"
              wide
            >
              <div className="design-system-button-grid design-system-button-grid-featured">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button size="sm" variant="secondary">Small</Button>
                <Button isPending variant="secondary">Pending</Button>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["selectedKey", "Controlled active tab key"],
                ["onSelectionChange", "Receives the next tab key"],
                ["Tabs.Panel", "Only renders when selected"]
              ]}
              code="<Tabs selectedKey={selectedTab} />"
              detail="Controlled tab selection"
              index="02"
              title="Tabs"
              tone="success"
            >
              <Tabs onSelectionChange={(key) => setSelectedTab(String(key))} selectedKey={selectedTab}>
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Preview tabs">
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
              api={[
                ["value", "Current segment key"],
                ["onChange", "Updates the selected mode"],
                ["aria-selected", "Marks active segment"]
              ]}
              code="<SegmentedControl value={mode} onValueChange={setMode} />"
              detail="Shared mode selector"
              index="03"
              title="Segmented"
              tone="neutral"
            >
              <SegmentedControl
                aria-label="Density"
                onValueChange={setSegment}
                options={[
                  { label: "compact", value: "compact" },
                  { label: "balanced", value: "balanced" },
                  { label: "spacious", value: "spacious" }
                ]}
                value={segment}
              />
              <div className={`design-system-density-meter design-system-density-meter-${segment}`}>
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
              api={[
                ["label", "Visible field label"],
                ["isInvalid", "Sets invalid visual state"],
                ["errorMessage", "Inline validation copy"]
              ]}
              code={'<Input label="Workspace" />'}
              detail="Label, placeholder, invalid copy"
              index="04"
              title="Input"
              tone="success"
            >
              <div className="design-system-field-stack">
                <Input label="Workspace" placeholder="weopen-core" />
                <Input errorMessage="Required field" isInvalid label="Slug" placeholder="project-slug" />
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["options", "Array of label/value pairs"],
                ["selectionMode", "single | multiple"],
                ["onChange", "Receives string or string[] value"]
              ]}
              code={'<SelectField selectionMode="multiple" />'}
              detail="Custom listbox, multi-select"
              index="05"
              title="Select Field"
              tone="neutral"
              wide
            >
              <div className="design-system-field-stack">
                <SelectField
                  label="Environment"
                  onChange={setEnvironment}
                  options={[
                    { description: "Local developer runtime", label: "Local", value: "local" },
                    { description: "Branch deploy channel", label: "Preview", value: "preview" },
                    { description: "Locked for this preview", disabled: true, label: "Production", value: "production" }
                  ]}
                  placeholder="Select an option"
                  value={environment}
                />
                <SelectField
                  label="Enabled Regions"
                  onChange={setEnabledEnvironments}
                  options={[
                    { description: "Primary sandbox", label: "Local", value: "local" },
                    { description: "Preview cluster", label: "Preview", value: "preview" },
                    { description: "Production edge", label: "Production", value: "production" }
                  ]}
                  placeholder="Select environments"
                  selectionMode="multiple"
                  value={enabledEnvironments}
                />
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["checked", "Controlled checked state"],
                ["name", "Groups radio options"],
                ["role", "Switch uses role=switch"]
              ]}
              code="<Checkbox /><Radio /><Switch />"
              detail="Checkbox, radio, switch"
              index="06"
              title="Choice Controls"
              tone="accent"
            >
              <div className="design-system-choice-stack">
                <Checkbox
                  checked={metricsEnabled}
                  description="Include system counters in the preview payload"
                  label="Metrics"
                  onChange={(event) => setMetricsEnabled(event.currentTarget.checked)}
                />
                <div className="design-system-radio-cluster" role="radiogroup" aria-label="Delivery mode">
                  <Radio
                    checked={deliveryMode === "realtime"}
                    description="Push updates immediately"
                    label="Realtime"
                    name="delivery-mode-preview"
                    onChange={() => setDeliveryMode("realtime")}
                  />
                  <Radio
                    checked={deliveryMode === "batch"}
                    description="Queue and ship in groups"
                    label="Batch"
                    name="delivery-mode-preview"
                    onChange={() => setDeliveryMode("batch")}
                  />
                </div>
                <Switch
                  checked={metricsEnabled}
                  description="Mirror the checkbox state with switch affordance"
                  label="Live Sync"
                  onChange={(event) => setMetricsEnabled(event.currentTarget.checked)}
                />
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["rows", "Initial text area height"],
                ["placeholder", "Muted helper copy"],
                ["resize", "Native vertical resize"]
              ]}
              code="<Textarea rows={4} />"
              detail="Resize, focus, overflow"
              index="07"
              title="Textarea"
              tone="neutral"
            >
              <Textarea aria-label="Textarea preview" placeholder="Multi-line input content goes here..." rows={4} />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["title", "Primary dropzone copy"],
                ["description", "Accepted file helper text"],
                ["onFileSelect", "Receives the selected File"]
              ]}
              code={'<FileDropzone title="Drop files" />'}
              detail="Drag, active, disabled"
              index="08"
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
              api={[
                ["tone", "success | warning | danger | neutral"],
                ["children", "Compact status label"],
                ["size", "Inherited chip sizing"]
              ]}
              code={'<StatusChip tone="success">Ready</StatusChip>'}
              detail="Dot, tone, compact label"
              index="09"
              title="Status Chip"
              tone="success"
            >
              <div className="design-system-chip-matrix">
                <StatusChip tone="success">Ready</StatusChip>
                <StatusChip tone="warning">Review</StatusChip>
                <StatusChip tone="danger">Blocked</StatusChip>
                <StatusChip>Idle</StatusChip>
                <Chip color="accent">Accent</Chip>
                <Chip>Neutral</Chip>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["variant", "default | outline | success | warning"],
                ["size", "Inherited chip size"],
                ["children", "Short metadata label"]
              ]}
              code={'<Badge variant="success">Synced</Badge>'}
              detail="Metadata and tiny labels"
              index="10"
              title="Badge"
              tone="warning"
            >
              <div className="design-system-chip-matrix">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Synced</Badge>
                <Badge variant="warning">Queued</Badge>
                <Badge variant="destructive">Danger</Badge>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["status", "success | warning | danger | accent"],
                ["Alert.Content", "Compound content wrapper"],
                ["Alert.Description", "Message body"]
              ]}
              code={'<Alert status="danger">...</Alert>'}
              detail="Success, warning, danger"
              index="11"
              title="Alert"
              tone="danger"
              wide
            >
              <div className="design-system-alert-stack">
                <Alert status="success"><Alert.Content><Alert.Description>SUCCESS Operation completed.</Alert.Description></Alert.Content></Alert>
                <Alert status="warning"><Alert.Content><Alert.Description>WARNING Check your input.</Alert.Description></Alert.Content></Alert>
                <Alert status="danger"><Alert.Content><Alert.Description>ERROR Something went wrong.</Alert.Description></Alert.Content></Alert>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["value", "Percent width as CSS variable"],
                ["label", "Inline row label"],
                ["tone", "Accent rail color"]
              ]}
              code="<ProgressRail items={items} />"
              detail="Shared progress primitive"
              index="12"
              title="Progress Rail"
              tone="accent"
            >
              <ProgressRail
                items={[
                  { label: "Build", value: 82 },
                  { label: "Audit", value: 64 },
                  { label: "Ship", value: 38 }
                ]}
              />
            </ComponentPreviewCard>
          </ComponentSection>

          <ComponentSection
            description="Cards, tables, and compact metadata surfaces for repeated scanning."
            eyebrow="Group 04"
            title="Data Display"
          >
            <ComponentPreviewCard
              api={[
                ["Card.Header", "Title and description slot"],
                ["Card.Content", "Primary content slot"],
                ["Card.Footer", "Secondary action slot"]
              ]}
              code="<Card><Card.Header />...</Card>"
              detail="Header, content, footer"
              index="13"
              title="Card"
              tone="neutral"
            >
              <Card className="design-system-nested-card">
                <Card.Header>
                  <Card.Title>Card title</Card.Title>
                  <Card.Description>This card contains content and supports actions.</Card.Description>
                </Card.Header>
                <Card.Footer>Actions ...</Card.Footer>
              </Card>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["columns", "Column definitions with render functions"],
                ["rows", "Typed row array"],
                ["minWidth", "Horizontal scroll threshold"]
              ]}
              code="<DataTable rows={rows} columns={columns} />"
              detail="Horizontal scroll, status cells"
              index="14"
              title="DataTable"
              tone="success"
              wide
            >
              <DataTable
                aria-label="Design system data table"
                columns={[
                  { id: "id", label: "ID", render: (row) => row.id },
                  { id: "name", label: "Name", isRowHeader: true, render: (row) => row.name },
                  { id: "status", label: "Status", render: (row) => <StatusChip tone={statusTone(row.status)}>{row.status}</StatusChip> },
                  { id: "updatedAt", label: "Updated at", render: (row) => row.updatedAt },
                  { id: "actions", label: "Actions", render: () => <PixelIcon name="more" variant="bare" /> }
                ]}
                getRowId={(row) => row.id}
                minWidth={680}
                rows={componentRows}
              />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["label", "Metric label"],
                ["value", "Hero metric value"],
                ["trendDirection", "up | down | neutral"]
              ]}
              code={'<MetricCard label="Coverage" value="98%" />'}
              detail="Hero number, trend, icon"
              index="15"
              title="Metric Card"
              tone="accent"
            >
              <MetricCard
                description="Component inventory"
                icon={<PixelIcon name="dashboard" />}
                label="Coverage"
                trend="+12%"
                trendDirection="up"
                value="98%"
              />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["title", "Empty state headline"],
                ["description", "Short recovery guidance"],
                ["actions", "Optional action slot"]
              ]}
              code={'<EmptyState title="No components" />'}
              detail="Empty content fallback"
              index="16"
              title="Empty State"
              tone="neutral"
            >
              <EmptyState
                actions={<Button size="sm" variant="secondary">Create</Button>}
                description="Add a component or connect a registry source."
                icon={<PixelIcon name="empty" />}
                title="No components"
              />
            </ComponentPreviewCard>
          </ComponentSection>

          <ComponentSection
            description="Dialog, theme controls, keyboard hints, and command-style navigation."
            eyebrow="Group 05"
            title="Overlay Navigation"
          >
            <ComponentPreviewCard
              api={[
                ["trigger", "Element that opens the dialog"],
                ["tone", "danger | warning | accent"],
                ["onConfirm", "Async-safe confirm callback"]
              ]}
              code={'<ConfirmActionDialog trigger={<Button />} />'}
              detail="Confirmation flow"
              index="17"
              title="Confirm Dialog"
              tone="danger"
            >
              <ConfirmActionDialog
                confirmLabel="Acknowledge"
                description="This preview opens a modal confirmation surface."
                onConfirm={() => undefined}
                title="Confirm action"
                trigger={<Button variant="danger">Open dialog</Button>}
              />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["toasts", "Array of queued notifications"],
                ["onDismiss", "Removes a toast by id"],
                ["placement", "top-right | bottom-right"]
              ]}
              code="<ToastViewport toasts={toasts} />"
              detail="Viewport notification stack"
              index="18"
              title="Toast"
              tone="success"
            >
              <div className="design-system-toast-preview">
                <Button onPress={showPreviewToast} variant="secondary">Push toast</Button>
                <span>{toasts.length.toString().padStart(2, "0")} queued</span>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["defaultTheme", "light | dark"],
                ["storageKey", "Local storage namespace"],
                ["onPress", "Inherited Button interaction"]
              ]}
              code={'<ThemeToggle defaultTheme="dark" />'}
              detail="Theme state control"
              index="19"
              title="Theme Toggle"
              tone="neutral"
            >
              <div className="design-system-inline-control">
                <ThemeToggle defaultTheme="dark" storageKey="weopen-design-system-preview" />
                <span>Toggle page theme token state</span>
              </div>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["keys", "Array of keyboard labels"],
                ["label", "Command description"],
                ["tone", "Optional active state"]
              ]}
              code={'<KeyboardShortcut keys={["⌘", "K"]} />'}
              detail="Keyboard hints"
              index="20"
              title="Keyboard"
              tone="success"
            >
              <KeyboardShortcut keys={["⌘", "K"]} label="Open command center" />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["items", "Command result rows"],
                ["activeIndex", "Highlighted command"],
                ["shortcut", "Keyboard helper text"]
              ]}
              code="<CommandSurface items={items} />"
              detail="Command palette surface"
              index="21"
              title="Command Surface"
              tone="accent"
              wide
            >
              <CommandSurface
                items={[
                  { name: "Button", description: "Primary actions and variants", status: "READY" },
                  { name: "Dialog", description: "Confirm destructive operations", status: "REVIEW" },
                  { name: "Marquee", description: "Motion rail for lightweight highlights", status: "LOCAL" }
                ]}
              />
            </ComponentPreviewCard>
          </ComponentSection>

          <ComponentSection
            description="Motion-focused primitives inspired by marquee, border beam, and kinetic UI patterns."
            eyebrow="Group 06"
            title="Motion Effects"
          >
            <ComponentPreviewCard
              api={[
                ["items", "Looped content labels"],
                ["speed", "CSS animation duration"],
                ["pauseOnHover", "Stops marquee while hovering"]
              ]}
              code="<MarqueeRail items={items} />"
              detail="MagicUI-style marquee"
              index="22"
              title="Marquee Rail"
              tone="accent"
              wide
            >
              <MarqueeRail aria-label="Animated component rail" items={["Button", "Card", "Tabs", "Dialog", "Table", "Marquee", "Tooltip"]} />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["children", "Framed content"],
                ["duration", "Beam sweep duration"],
                ["tone", "Accent edge color"]
              ]}
              code="<BorderBeam>Release 0.1</BorderBeam>"
              detail="Animated border highlight"
              index="23"
              title="Border Beam"
              tone="warning"
            >
              <BorderBeam>
                <strong>Release 0.1</strong>
                <span>Animated frame primitive</span>
              </BorderBeam>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["items", "Visible collaborator initials"],
                ["max", "Maximum stacked items"],
                ["status", "Presence color"]
              ]}
              code="<AvatarStack items={items} />"
              detail="Presence stack"
              index="24"
              title="Avatar Stack"
              tone="success"
            >
              <AvatarStack
                items={[
                  { initials: "WX", label: "Will Xue" },
                  { initials: "AI", label: "Assistant" },
                  { initials: "GO", label: "Go service" },
                  { initials: "TS", label: "TypeScript app" }
                ]}
                statusLabel="4 online"
              />
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["label", "Tooltip trigger copy"],
                ["content", "Floating helper text"],
                ["placement", "top | bottom"]
              ]}
              code={'<Tooltip content="Token locked">Hover</Tooltip>'}
              detail="Portal hover hint"
              index="25"
              title="Tooltip"
              tone="neutral"
            >
              <Tooltip content="Token locked to dark mode">
                <Button variant="secondary">Hover token</Button>
              </Tooltip>
            </ComponentPreviewCard>

            <ComponentPreviewCard
              api={[
                ["orientation", "horizontal | vertical"],
                ["className", "Custom spacing and color"],
                ["role", "separator"]
              ]}
              code={'<Separator orientation="horizontal" />'}
              detail="Structural divider"
              index="26"
              title="Separator"
              tone="neutral"
            >
              <div className="design-system-separator-demo">
                <span>Before</span>
                <Separator />
                <span>After</span>
              </div>
            </ComponentPreviewCard>
          </ComponentSection>
        </div>

        <div className="design-system-token-panel-shell" ref={tokenPanelShellRef}>
          <aside className="design-system-token-panel" aria-label="Theme tokens" ref={tokenPanelRef}>
            <section className="design-system-token-instrument">
              <h2>Theme Tokens</h2>
              <div className="design-system-token-gauge" aria-hidden="true">
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
          <ScrollRail className="design-system-token-scroll-rail" containerRef={tokenPanelRef} minProgress={0.12} />
          <ScrollRail
            className="design-system-token-horizontal-scroll-rail"
            containerRef={tokenPanelRef}
            minProgress={0.12}
            orientation="horizontal"
            visibility="scrollable"
          />
        </div>
      </section>
    </main>
  );
}

function scrollDesignSystemGroup(page: HTMLElement | null, target: string, behavior: ScrollBehavior) {
  const targetNode = document.getElementById(target);

  if (!page || !targetNode) {
    return;
  }

  const pageRect = page.getBoundingClientRect();
  const targetRect = targetNode.getBoundingClientRect();

  page.scrollTo({
    behavior,
    top: page.scrollTop + targetRect.top - pageRect.top - 16
  });
}

function ComponentSection({ children, description, eyebrow, title }: ComponentSectionProps) {
  return (
    <section className="design-system-component-section" id={title.toLowerCase().replace(/\s+/g, "-")}>
      <div className="design-system-section-header">
        <span>{eyebrow}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="design-system-grid" aria-label={`${title} components`}>
        {children}
      </div>
    </section>
  );
}

function ComponentPreviewCard({ api, children, code, detail, index, title, tone = "neutral", wide }: ComponentPreviewCardProps) {
  return (
    <Card className={`design-system-spec-card design-system-component-card${wide ? " design-system-component-card-wide" : ""}`}>
      <Card.Header>
        <div className="design-system-card-title-row">
          <Card.Title>{title}</Card.Title>
          <StatusChip tone={tone}>{index}</StatusChip>
        </div>
        <p className="design-system-card-detail">{detail}</p>
      </Card.Header>
      <Card.Content>
        <div className="design-system-preview-surface">
          {children}
        </div>
        <details className="design-system-usage-panel">
          <summary>Usage / API</summary>
          <pre><code>{code}</code></pre>
          <dl>
            {api.map(([name, description]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </details>
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
