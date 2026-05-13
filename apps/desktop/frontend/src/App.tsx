import { Button, Card } from "@weopen/ui";
import "./style.css";

const capabilities = [
  "连接远程 API",
  "复用 Web UI 基础组件",
  "承载本地开发者工具",
  "后续支持离线偏好设置"
];

export function App() {
  return (
    <main className="desktop-shell">
      <section className="desktop-header">
        <div>
          <p className="desktop-kicker">WeOpen Desktop</p>
          <h1>个人管理平台桌面端</h1>
          <p>
            M0 阶段先建立 Wails v3 桌面壳，后续接入远程 API、工具箱和本地设置。
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="secondary">
          刷新
        </Button>
      </section>
      <section className="desktop-grid">
        {capabilities.map((capability) => (
          <Card description="已纳入桌面端路线" key={capability} title={capability} />
        ))}
      </section>
    </main>
  );
}
