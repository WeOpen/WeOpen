"use client";

import { useState } from "react";
import { SettingsForm } from "@/features/settings/settings-form";
import { AccountProfilePanel } from "@/features/settings/account-profile-panel";
import { AdminAccessPanel } from "@/features/settings/admin-access-panel";
import { AuditLogPanel } from "@/features/settings/audit-log-panel";
import { MFAPanel } from "@/features/settings/mfa-panel";
import { PasswordPanel } from "@/features/settings/password-panel";
import { Card, PageHeader, SegmentedControl, StatusChip } from "@weopen/ui";
import webPackage from "../../../package.json";

type SettingsSection = "system" | "user" | "log" | "about";

const settingsSectionOptions = [
  { label: "SYSTEM", value: "system" },
  { label: "USER", value: "user" },
  { label: "LOG", value: "log" },
  { label: "ABOUT", value: "about" }
];

const sectionMeta: Record<SettingsSection, { description: string; status: string; title: string }> = {
  about: {
    description: "Project identity, architecture notes, and operating principles for this console.",
    status: `v${webPackage.version}`,
    title: "About WeOpen"
  },
  log: {
    description: "Search and filter audit events emitted by auth, settings, RBAC, and plugin actions.",
    status: "Live history",
    title: "Audit trail"
  },
  system: {
    description: "Provider credentials and platform security boundaries. Secret values never return to the browser.",
    status: "Server backed",
    title: "System configuration"
  },
  user: {
    description: "Current account, password, MFA, RBAC users, roles, and active session controls.",
    status: "Session scoped",
    title: "User and access"
  }
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("system");
  const activeMeta = sectionMeta[activeSection];

  return (
    <section className="settings-console">
      <PageHeader
        actions={<StatusChip tone="success">Live API</StatusChip>}
        eyebrow="Settings"
        title="Settings"
        description="System configuration, personal access settings, audit history, and product information."
      />
      <div className="settings-console-switch-row">
        <SegmentedControl
          aria-label="Settings sections"
          className="settings-console-segmented"
          onValueChange={(value) => setActiveSection(value as SettingsSection)}
          options={settingsSectionOptions}
          value={activeSection}
        />
      </div>
      <div className="settings-section-brief">
        <div>
          <strong>{activeMeta.title}</strong>
          <p>{activeMeta.description}</p>
        </div>
        <StatusChip tone={activeSection === "log" ? "success" : "accent"}>{activeMeta.status}</StatusChip>
      </div>

      {activeSection === "system" ? (
        <div className="settings-console-grid">
          <div className="settings-left-column">
            <SettingsForm />
          </div>

          <div className="settings-middle-column">
            <Card>
              <Card.Header>
                <Card.Title>Security Flow</Card.Title>
              </Card.Header>
              <Card.Content className="settings-provider-list">
                <div>
                  <span>Session</span>
                  <strong>
                    <i /> HttpOnly Cookie
                  </strong>
                  <small>Raw tokens are not exposed to browser JavaScript.</small>
                </div>
                <div>
                  <span>CSRF</span>
                  <strong>
                    <i /> Double Submit
                  </strong>
                  <small>Unsafe cookie-authenticated requests require X-CSRF-Token.</small>
                </div>
                <div>
                  <span>RBAC</span>
                  <strong>
                    <i /> Fail Closed
                  </strong>
                  <small>Plugin mutations without explicit permission rules are denied.</small>
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      ) : null}

      {activeSection === "user" ? (
        <div className="settings-user-panel">
          <div className="settings-left-column">
            <AccountProfilePanel />
            <PasswordPanel />
            <MFAPanel />
          </div>
          <div className="settings-middle-column">
            <AdminAccessPanel />
          </div>
        </div>
      ) : null}

      {activeSection === "log" ? (
        <div className="settings-log-panel">
          <AuditLogPanel />
        </div>
      ) : null}

      {activeSection === "about" ? (
        <div className="settings-about-panel">
          <Card className="settings-about-card">
            <Card.Header>
              <Card.Title>WeOpen</Card.Title>
              <StatusChip tone="success">v{webPackage.version}</StatusChip>
            </Card.Header>
            <Card.Content className="settings-about-content">
              <p>
                WeOpen is a personal management platform for operating plugins, provider secrets, domains,
                storage, content, and developer utilities from one Nothing-style console.
              </p>
              <dl className="settings-about-list">
                <div>
                  <dt>Workspace</dt>
                  <dd>Next.js web app, Go API, Wails desktop shell, shared UI, plugin SDK, and API client packages.</dd>
                </div>
                <div>
                  <dt>Plugin model</dt>
                  <dd>Built-in plugins expose manifests, widgets, authenticated API routes, and typed frontend boundaries.</dd>
                </div>
                <div>
                  <dt>Release hygiene</dt>
                  <dd>Version and changelog checks are wired into the workspace release validation flow.</dd>
                </div>
              </dl>
            </Card.Content>
          </Card>

          <Card className="settings-about-card">
            <Card.Header>
              <Card.Title>Principles</Card.Title>
            </Card.Header>
            <Card.Content className="settings-provider-list">
              <div>
                <span>Local first</span>
                <strong>
                  <i /> Portable
                </strong>
                <small>Local mode uses safe defaults while production persistence is enabled by DATABASE_URL.</small>
              </div>
              <div>
                <span>Secure by default</span>
                <strong>
                  <i /> Fail closed
                </strong>
                <small>Cookie sessions, CSRF protection, RBAC checks, MFA, and audit logs protect admin surfaces.</small>
              </div>
              <div>
                <span>Plugin boundary</span>
                <strong>
                  <i /> Explicit
                </strong>
                <small>Frontend and backend plugin registration stay deliberate, typed, and reviewable.</small>
              </div>
            </Card.Content>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
