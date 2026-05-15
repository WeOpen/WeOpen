import { useMemo, useState } from "react";
import { Button, Card, Input } from "@weopen/ui";
import {
  saveRemoteApiSettings,
  testRemoteAPIConnection,
  type RemoteApiConnectionStatus,
  type RemoteApiSettings as RemoteApiSettingsValue
} from "@/lib/apiClient";

type RemoteApiSettingsProps = {
  settings: RemoteApiSettingsValue;
  onSaved(settings: RemoteApiSettingsValue): void;
};

export function RemoteApiSettings({ onSaved, settings }: RemoteApiSettingsProps) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [sessionToken, setSessionToken] = useState(settings.sessionToken);
  const [message, setMessage] = useState<string>();
  const [connection, setConnection] = useState<RemoteApiConnectionStatus>();
  const [isTesting, setIsTesting] = useState(false);

  const currentSettings = useMemo<RemoteApiSettingsValue>(
    () => ({ baseUrl, sessionToken }),
    [baseUrl, sessionToken]
  );

  function handleSave() {
    try {
      const saved = saveRemoteApiSettings(currentSettings);
      onSaved(saved);
      setMessage("已保存桌面端远程 API 设置。");
      setConnection(undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存设置失败。");
    }
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setMessage(undefined);
    const status = await testRemoteAPIConnection(currentSettings);
    setConnection(status);
    setIsTesting(false);
  }

  return (
    <Card
      className="desktop-panel"
      description="配置桌面端要连接的 WeOpen API。Session token 仅保存在本机浏览器存储中，用于带 Bearer 头访问受保护接口。"
      title="远程 API 设置"
    >
      <div className="settings-form">
        <Input
          label="API Base URL"
          name="remote-api-base-url"
          onChange={(event) => setBaseUrl(event.currentTarget.value)}
          placeholder="http://127.0.0.1:8080"
          value={baseUrl}
        />
        <Input
          autoComplete="off"
          label="Session Token"
          name="remote-api-session-token"
          onChange={(event) => setSessionToken(event.currentTarget.value)}
          placeholder="登录后复制的 API session token，可留空仅查看 /healthz"
          type="password"
          value={sessionToken}
        />
        <div className="button-row">
          <Button onClick={handleSave}>保存设置</Button>
          <Button disabled={isTesting} onClick={handleTestConnection} variant="secondary">
            {isTesting ? "测试中..." : "测试 /healthz"}
          </Button>
        </div>
      </div>
      {message ? <p className="form-message">{message}</p> : null}
      {connection ? (
        <div className={connection.ok ? "connection-status ok" : "connection-status error"}>
          <strong>{connection.ok ? "连接正常" : "连接失败"}</strong>
          <span>
            {connection.ok
              ? `${connection.service ?? "remote-api"} / ${connection.version ?? "unknown"}`
              : connection.error}
          </span>
        </div>
      ) : null}
    </Card>
  );
}
