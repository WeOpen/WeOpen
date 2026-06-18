import { useState } from "react";
import { Button, Card, Chip, Input, Textarea } from "@weopen/ui";
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
} from "@weopen/api-client/devtools";

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
            <Chip className="tool-tag" color="accent" key={tool.id} size="sm" variant="outline">
              {tool.name}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="desktop-panel" title="JSON">
        <Textarea
          aria-label="JSON input"
          className="desktop-textarea"
          onChange={(event) => setJsonInput(event.currentTarget.value)}
          spellCheck={false}
          value={jsonInput}
        />
        <div className="button-row">
          <Button onPress={() => setJsonOutput(formatJson(jsonInput))}>格式化</Button>
          <Button onPress={() => setJsonOutput(compressJson(jsonInput))} variant="secondary">
            压缩
          </Button>
        </div>
        <ToolOutput result={jsonOutput} />
      </Card>

      <Card className="desktop-panel" title="Base64">
        <Textarea
          aria-label="Base64 text input"
          className="desktop-textarea"
          onChange={(event) => setTextInput(event.currentTarget.value)}
          value={textInput}
        />
        <div className="button-row">
          <Button onPress={() => setTextOutput(encodeBase64(textInput))}>编码</Button>
          <Button onPress={() => setTextOutput(decodeBase64(textInput))} variant="secondary">
            解码
          </Button>
        </div>
        <ToolOutput result={textOutput} />
      </Card>

      <Card className="desktop-panel" title="时间转换">
        <Input
          aria-label="Timestamp or date input"
          className="desktop-input"
          onChange={(event) => setTimeInput(event.currentTarget.value)}
          value={timeInput}
        />
        <div className="button-row">
          <Button onPress={() => setTimeOutput(convertTimestampToDate(timeInput))}>时间戳转日期</Button>
          <Button onPress={() => setTimeOutput(convertDateToTimestamp(timeInput))} variant="secondary">
            日期转时间戳
          </Button>
        </div>
        <ToolOutput result={timeOutput} />
      </Card>

      <Card className="desktop-panel" title="UUID 与正则">
        <div className="uuid-row">
          <code>{uuid}</code>
          <Button onPress={() => setUuid(generateUuid())} variant="secondary">
            重新生成
          </Button>
        </div>
        <Input
          aria-label="Regex pattern"
          className="desktop-input"
          onChange={(event) => setRegexPattern(event.currentTarget.value)}
          placeholder="Regex pattern"
          value={regexPattern}
        />
        <Textarea
          aria-label="Regex sample text"
          className="desktop-textarea"
          onChange={(event) => setRegexText(event.currentTarget.value)}
          value={regexText}
        />
        <Button
          onPress={() => {
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
