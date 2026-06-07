"use client";

import { useMemo, useState } from "react";
import { decodeBase64, decodeUrl, encodeBase64, encodeUrl } from "./tools";
import { CopyButton } from "./copy-button";
import { Alert, Button, Textarea } from "@weopen/ui";

type EncodingMode = "base64-encode" | "base64-decode" | "url-encode" | "url-decode";

const modeLabels: Record<EncodingMode, string> = {
  "base64-encode": "Base64 encode",
  "base64-decode": "Base64 decode",
  "url-encode": "URL encode",
  "url-decode": "URL decode"
};

export function EncodingTool() {
  const [input, setInput] = useState("https://weopen.dev/?q=developer tools");
  const [mode, setMode] = useState<EncodingMode>("url-encode");
  const result = useMemo(() => {
    if (mode === "base64-encode") {
      return encodeBase64(input);
    }
    if (mode === "base64-decode") {
      return decodeBase64(input);
    }
    if (mode === "url-encode") {
      return encodeUrl(input);
    }
    return decodeUrl(input);
  }, [input, mode]);

  return (
    <section className="tool-panel" aria-labelledby="encoding-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="encoding-tool-heading">Encoding lab</h2>
          <p>Base64 and URL encode/decode tools use browser APIs only, so tokens and URLs never leave the page.</p>
        </div>
        <div className="tool-actions">
          {(Object.keys(modeLabels) as EncodingMode[]).map((nextMode) => (
            <Button
              aria-pressed={mode === nextMode}
              key={nextMode}
              onPress={() => setMode(nextMode)}
              variant={mode === nextMode ? "primary" : "secondary"}
            >
              {modeLabels[nextMode]}
            </Button>
          ))}
          <CopyButton disabled={!result.ok} value={result.output} />
        </div>
      </div>

      <div className="tool-grid">
        <Textarea className="tool-textarea" label="Input" onChange={(event) => setInput(event.target.value)} spellCheck={false} value={input} />
        <Textarea className="tool-textarea" label="Output" readOnly spellCheck={false} value={result.ok ? result.output : ""} />
      </div>
      {!result.ok ? (
        <Alert status="danger"><Alert.Content><Alert.Description>{result.error}</Alert.Description></Alert.Content></Alert>
      ) : null}
    </section>
  );
}
