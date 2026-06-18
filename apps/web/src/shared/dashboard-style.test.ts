import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const globalsCss = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8"
);
const dashboardPage = readFileSync(
  fileURLToPath(new URL("../../app/(admin)/dashboard/page.tsx", import.meta.url)),
  "utf8"
);
const pluginsPage = readFileSync(
  fileURLToPath(new URL("../../app/(admin)/plugins/page.tsx", import.meta.url)),
  "utf8"
);
const appShell = readFileSync(
  fileURLToPath(new URL("./layout/app-shell.tsx", import.meta.url)),
  "utf8"
);
const apiDirectory = readFileSync(
  fileURLToPath(new URL("../../app/(admin)/api/api-directory.tsx", import.meta.url)),
  "utf8"
);
const toolsPage = readFileSync(
  fileURLToPath(new URL("../plugins/devtools/tools-page.tsx", import.meta.url)),
  "utf8"
);
const settingsPage = readFileSync(
  fileURLToPath(new URL("../../app/(admin)/settings/page.tsx", import.meta.url)),
  "utf8"
);
const settingsForm = readFileSync(
  fileURLToPath(new URL("../features/settings/settings-form.tsx", import.meta.url)),
  "utf8"
);
const auditLogPanel = readFileSync(
  fileURLToPath(new URL("../features/settings/audit-log-panel.tsx", import.meta.url)),
  "utf8"
);
const passwordPanel = readFileSync(
  fileURLToPath(new URL("../features/settings/password-panel.tsx", import.meta.url)),
  "utf8"
);
const accountProfilePanel = readFileSync(
  fileURLToPath(new URL("../features/settings/account-profile-panel.tsx", import.meta.url)),
  "utf8"
);
const adminAccessPanel = readFileSync(
  fileURLToPath(new URL("../features/settings/admin-access-panel.tsx", import.meta.url)),
  "utf8"
);

describe("dashboard table scroll styling", () => {
  test("keeps the dashboard module table horizontally scrollable", () => {
    assert.match(
      globalsCss,
      /\.dashboard-module-table \.table__scroll-container,\s*\.dashboard-module-table\.weopen-horizontal-scroll-viewport\s*{[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/s
    );
  });

  test("dashboard and plugin pages use generated pixel icons instead of glyph helpers", () => {
    assert.match(dashboardPage, /PixelIcon/);
    assert.doesNotMatch(dashboardPage, /function iconForName/);
    assert.match(pluginsPage, /PixelIcon/);
    assert.doesNotMatch(pluginsPage, /function iconForPlugin/);
  });

  test("admin shell navigation uses Next client links", () => {
    assert.match(appShell, /import Link from "next\/link"/);
    assert.match(appShell, /linkComponent=\{Link\}/);
  });

  test("API and Tools metric chips align with the icon box and hover accent", () => {
    assert.match(apiDirectory, /trend="live"/);
    assert.match(toolsPage, /className="devtools-stats"/);
    assert.match(toolsPage, /trend=\{loadState === "ready" \? "active" : undefined\}/);
    assert.match(
      globalsCss,
      /\.api-workspace \.weopen-metric-card:hover \.weopen-metric-card-icon,[^}]*\.devtools-workspace \.weopen-metric-card:focus-within \.weopen-metric-card-icon\s*{[^}]*color: var\(--accent\);/s
    );
    assert.match(
      globalsCss,
      /\.api-workspace \.weopen-metric-card-value-row \.chip,\s*\.devtools-workspace \.weopen-metric-card-value-row \.chip\s*{[^}]*justify-content: center;[^}]*min-width: var\(--api-metric-icon-box\);[^}]*width: var\(--api-metric-icon-box\);/s
    );
    assert.doesNotMatch(
      globalsCss,
      /\.devtools-workspace \.weopen-metric-card-icon\s*{[^}]*height: 48px;/s
    );
  });

  test("Tools runtime status chips live inside tool panels instead of the sidebar", () => {
    assert.doesNotMatch(toolsPage, /Runtime Map/);
    assert.doesNotMatch(toolsPage, /className="tool-catalog"/);
    assert.match(toolsPage, /statusSlot=\{<ToolStatusChips tools=\{toolsByPanelId\.get\(panel\.id\) \?\? \[\]\} \/>\}/);
    assert.match(toolsPage, /function ToolStatusChips/);
  });

  test("Settings segments system, user, logs, and about content", () => {
    assert.match(settingsPage, /SegmentedControl/);
    assert.match(
      settingsPage,
      /label: "SYSTEM", value: "system"[\s\S]*label: "USER", value: "user"[\s\S]*label: "LOG", value: "log"[\s\S]*label: "ABOUT", value: "about"/
    );
    assert.match(settingsPage, /type SettingsSection = "system" \| "user" \| "log" \| "about"/);
    assert.match(settingsPage, /activeSection === "system"[\s\S]*className="settings-console-grid"/);
    assert.match(settingsPage, /activeSection === "user"[\s\S]*className="settings-user-panel"[\s\S]*<AccountProfilePanel \/>[\s\S]*<PasswordPanel \/>[\s\S]*<MFAPanel \/>[\s\S]*<AdminAccessPanel \/>/);
    assert.match(settingsPage, /activeSection === "log"[\s\S]*className="settings-log-panel"[\s\S]*<AuditLogPanel \/>/);
    assert.match(settingsPage, /activeSection === "about"[\s\S]*className="settings-about-panel"[\s\S]*WeOpen/);
    assert.doesNotMatch(
      settingsPage,
      /activeSection === "system"[\s\S]*<AdminAccessPanel \/>[\s\S]*activeSection === "user"/
    );
    assert.doesNotMatch(
      settingsPage,
      /className="settings-console-grid"[\s\S]*<AuditLogPanel \/>[\s\S]*<\/div>\s*\{activeSection === "log"/
    );
    assert.match(globalsCss, /\.settings-console-switch-row\s*{[^}]*display: flex;[^}]*justify-content: flex-start;/s);
    assert.match(globalsCss, /\.settings-console-grid\s*{[^}]*grid-template-columns: minmax\(300px, 1fr\) minmax\(300px, 1fr\);/s);
    assert.match(globalsCss, /\.settings-user-panel,\s*\.settings-log-panel,\s*\.settings-about-panel\s*{[^}]*display: grid;/s);
    assert.match(
      globalsCss,
      /@media \(max-width: 1320px\) \{[\s\S]*\.settings-console-grid,\s*\.settings-user-panel,\s*\.settings-about-panel,[\s\S]*grid-template-columns: 1fr;/s
    );
  });


  test("Settings feature panels expose real account, password, provider, and audit controls", () => {
    assert.match(accountProfilePanel, /currentUser/);
    assert.match(accountProfilePanel, /passwordChangedAt/);
    assert.match(passwordPanel, /changePassword/);
    assert.match(passwordPanel, /newPasswordConfirmation/);
    assert.match(passwordPanel, /setNewPassword\(""\)/);
    assert.match(passwordPanel, /isPasswordPolicyMet/);
    assert.match(adminAccessPanel, /SelectField/);
    assert.match(adminAccessPanel, /selectionMode="multiple"/);
    assert.match(adminAccessPanel, /settings-session-list/);
    assert.match(adminAccessPanel, /formatSessionId/);
    assert.match(settingsForm, /vercelApiToken/);
    assert.match(settingsForm, /Cloudflare API Token/);
    assert.match(settingsForm, /Vercel API Token/);
    assert.match(auditLogPanel, /searchQuery/);
    assert.match(auditLogPanel, /resourceFilter/);
    assert.match(auditLogPanel, /filteredEntries/);
    assert.match(globalsCss, /\.settings-session-card \.card__header/);
    assert.match(globalsCss, /\.settings-session-list div\s*{[^}]*grid-template-columns: minmax\(0, 1fr\) auto auto;/s);
  });

  test("Tools panel headers use title, status, description, then actions layout", () => {
    assert.match(
      globalsCss,
      /\.tool-panel-header\s*{[^}]*grid-template-areas:\s*"title status"\s*"description description"\s*"actions actions";/s
    );
    assert.match(globalsCss, /\.tool-status-chips\s*{[^}]*grid-area: status;[^}]*justify-content: flex-end;/s);
    assert.match(globalsCss, /\.tool-actions\s*{[^}]*grid-area: actions;[^}]*justify-content: flex-end;/s);
    assert.match(globalsCss, /\.tool-panel\s*{[^}]*gap: clamp\(12px, 0\.85vw, 16px\);/s);
    assert.match(globalsCss, /\.tool-panel\s*{[^}]*align-content: start;[^}]*grid-auto-rows: max-content;/s);
    assert.match(globalsCss, /\.tool-grid\s*{[^}]*align-items: stretch;/s);
    assert.match(globalsCss, /\.tool-grid\s*{[^}]*grid-auto-rows: 1fr;/s);
  });
});
