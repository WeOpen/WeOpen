import { useState } from "react";
import { Button, Card } from "@weopen/ui";
import {
  compressJson,
  convertDateToTimestamp,
  convertTimestampToDate,
  decodeBase64,
  developerTools,
  encodeBase64,
  formatJson,
  generateUuid,
  testRegex,
  type ToolResult
} from "@weopen/sdk/devtools";

const defaultJson = '{"name":"WeOpen","desktop":true}';

export function DesktopTools() {
  const [jsonInput, setJsonInput] = useState(defaultJson);
  const [jsonOutput, setJsonOutput] = useState<ToolResult>();
  const [textInput, setTextInput] = useState("WeOpen 工具箱");
  const [textOutput, setTextOutput] = useState<ToolResult>();
  const [timeInput, setTimeInput] = useState("1704067200000");
  const [timeOutput, setTimeOutput] = useState<ToolResult>();
  const [regexPattern, setRegexPattern] = useState("We\\w+");
  const [regexText, setRegexText] = useState("WeOpen and WeMail");
  const [regexOutput, setRegexOutput] = useState("No matches yet");
  const [uuid, setUuid] = useState(generateUuid());

  const availableTools = developerTools.filter((tool) => tool.status === "available");

  return (
    <section className="tools-layout">
      <Card
        className="desktop-panel"
        description={`${availableTools.length} 个本地可用工具已复用自 Web 工具核心，不依赖 Web 路由。`}
        title="本地开发者工具"
      >
        <div className="tool-tags">
          {availableTools.map((tool) => (
            <span key={tool.id}>{tool.name}</span>
          ))}
        </div>
      </Card>

      <Card className="desktop-panel" title="JSON">
        <textarea
          className="desktop-textarea"
          onChange={(event) => setJsonInput(event.currentTarget.value)}
          value={jsonInput}
        />
        <div className="button-row">
          <Button onClick={() => setJsonOutput(formatJson(jsonInput))}>格式化</Button>
          <Button onClick={() => setJsonOutput(compressJson(jsonInput))} variant="secondary">
            压缩
          </Button>
        </div>
        <ToolOutput result={jsonOutput} />
      </Card>

      <Card className="desktop-panel" title="Base64">
        <textarea
          className="desktop-textarea"
          onChange={(event) => setTextInput(event.currentTarget.value)}
          value={textInput}
        />
        <div className="button-row">
          <Button onClick={() => setTextOutput(encodeBase64(textInput))}>编码</Button>
          <Button onClick={() => setTextOutput(decodeBase64(textInput))} variant="secondary">
            解码
          </Button>
        </div>
        <ToolOutput result={textOutput} />
      </Card>

      <Card className="desktop-panel" title="时间转换">
        <input
          className="desktop-input"
          onChange={(event) => setTimeInput(event.currentTarget.value)}
          value={timeInput}
        />
        <div className="button-row">
          <Button onClick={() => setTimeOutput(convertTimestampToDate(timeInput))}>时间戳转日期</Button>
          <Button onClick={() => setTimeOutput(convertDateToTimestamp(timeInput))} variant="secondary">
            日期转时间戳
          </Button>
        </div>
        <ToolOutput result={timeOutput} />
      </Card>

      <Card className="desktop-panel" title="UUID 与正则">
        <div className="uuid-row">
          <code>{uuid}</code>
          <Button onClick={() => setUuid(generateUuid())} variant="secondary">
            重新生成
          </Button>
        </div>
        <input
          className="desktop-input"
          onChange={(event) => setRegexPattern(event.currentTarget.value)}
          placeholder="Regex pattern"
          value={regexPattern}
        />
        <textarea
          className="desktop-textarea"
          onChange={(event) => setRegexText(event.currentTarget.value)}
          value={regexText}
        />
        <Button
          onClick={() => {
            const result = testRegex(regexPattern, "g", regexText);
            setRegexOutput(result.ok ? result.output : (result.error ?? "Regex failed"));
          }}
        >
          测试正则
        </Button>
        <pre className="tool-output">{regexOutput}</pre>
      </Card>
    </section>
  );
}

function ToolOutput({ result }: { result?: ToolResult }) {
  if (!result) {
    return null;
  }
  return (
    <pre className={result.ok ? "tool-output" : "tool-output error"}>
      {result.ok ? result.output : result.error}
    </pre>
  );
}
