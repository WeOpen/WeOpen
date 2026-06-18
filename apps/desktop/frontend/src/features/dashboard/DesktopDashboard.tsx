import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, StatusChip, type StatusChipTone } from "@weopen/ui";
import {
  loadDashboardSummary,
  type RemoteApiSettings
} from "@/shared/api/apiClient";
import type { DashboardSummary } from "@weopen/api-client/client";

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
  const statusTone: StatusChipTone = summary.status === "online"
    ? "success"
    : summary.status === "offline"
      ? "danger"
      : "warning";

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
          <StatusChip className="status-pill" tone={statusTone}>{statusLabel}</StatusChip>
          <Button disabled={isLoading} onPress={refresh} variant="secondary">
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
          <Button onPress={onOpenSettings}>去配置远程 API</Button>
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
                  <span className="plugin-description">{plugin.description || plugin.id}</span>
                </div>
                <StatusChip
                  className={plugin.enabled ? "plugin-enabled" : "plugin-disabled"}
                  tone={plugin.enabled ? "success" : "danger"}
                >
                  {plugin.enabled ? "启用" : "停用"}
                </StatusChip>
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
