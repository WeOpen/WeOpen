import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card } from "@weopen/ui";
import {
  loadDashboardSummary,
  type RemoteApiSettings
} from "@/lib/apiClient";
import type { DashboardSummary } from "@weopen/sdk/client";

type DesktopDashboardProps = {
  settings: RemoteApiSettings;
  onOpenSettings(): void;
};

const emptySummary: DashboardSummary = {
  plugins: [],
  status: "unconfigured"
};

export function DesktopDashboard({ onOpenSettings, settings }: DesktopDashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(false);

  const statusLabel = useMemo(() => {
    if (summary.status === "online") {
      return "远程 API 在线";
    }
    if (summary.status === "offline") {
      return "远程 API 不可用";
    }
    return "尚未配置远程 API";
  }, [summary.status]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setSummary(await loadDashboardSummary(settings));
    setIsLoading(false);
  }, [settings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="dashboard-grid">
      <Card
        className={`desktop-panel dashboard-status dashboard-status-${summary.status}`}
        description={settings.baseUrl || "配置后即可在桌面端查看平台状态。"}
        title="平台连接状态"
      >
        <div className="status-row">
          <span className="status-pill">{statusLabel}</span>
          <Button disabled={isLoading} onClick={refresh} variant="secondary">
            {isLoading ? "刷新中..." : "刷新"}
          </Button>
        </div>
        {summary.error ? <p className="error-text">{summary.error}</p> : null}
        {summary.health ? (
          <dl className="metric-list">
            <div>
              <dt>Service</dt>
              <dd>{summary.health.service}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{summary.health.status}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{summary.health.version ?? "unknown"}</dd>
            </div>
          </dl>
        ) : null}
        {summary.status === "unconfigured" ? (
          <Button onClick={onOpenSettings}>去配置远程 API</Button>
        ) : null}
      </Card>

      <Card
        className="desktop-panel"
        description="桌面端优先展示本地工具，远程插件列表在配置 API 和 token 后自动加载。"
        title="远程插件概览"
      >
        {summary.plugins.length ? (
          <ul className="plugin-list">
            {summary.plugins.map((plugin) => (
              <li key={plugin.id}>
                <div>
                  <strong>{plugin.name}</strong>
                  <span>{plugin.description || plugin.id}</span>
                </div>
                <span className={plugin.enabled ? "plugin-enabled" : "plugin-disabled"}>
                  {plugin.enabled ? "启用" : "停用"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-text">
            {summary.status === "unconfigured"
              ? "未配置远程 API，当前仅使用本地桌面工具。"
              : "暂未读取到远程插件，可能需要有效 session token。"}
          </p>
        )}
      </Card>
    </section>
  );
}
