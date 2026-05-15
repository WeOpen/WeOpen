import Link from "next/link";
import { AppShell } from "@/shared/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell currentPath="/dashboard">
      <section className="admin-hero">
        <div className="ui-card admin-hero-panel">
          <p className="page-kicker">WeOpen Admin</p>
          <h1 className="admin-hero-title">
            Personal platform, <span>thesvg-style</span> admin.
          </h1>
          <p className="admin-hero-description">
            Manage blog content, developer tools, domains, R2 storage and personal data through one engineered shell shared by Web and Desktop.
          </p>
          <div className="admin-hero-actions">
            <Link className="ui-button ui-button-primary" href="/dashboard">
              Open dashboard
            </Link>
            <Link className="ui-button ui-button-secondary" href="/plugins">
              View plugins
            </Link>
          </div>
        </div>
        <div className="admin-stat-list">
          <div className="admin-stat">
            <strong>4</strong>
            <span>Built-in management plugins</span>
          </div>
          <div className="admin-stat">
            <strong>1</strong>
            <span>Shared Admin Shell</span>
          </div>
          <div className="admin-stat">
            <strong>Web/Desktop</strong>
            <span>Shared components, SDK and design tokens</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
