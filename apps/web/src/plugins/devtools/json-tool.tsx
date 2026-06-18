"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { compressJson, formatJson } from "./tools";
import { CopyButton } from "./copy-button";
import type { ToolResult } from "./types";
import { Alert, Button, Textarea } from "@weopen/ui";

type JsonMode = "format" | "compress";

const emptyResult: ToolResult = { ok: true, output: "" };

export function JsonTool({ statusSlot }: { statusSlot?: ReactNode }) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<JsonMode>("format");
  const result = useMemo(
    () => (input.trim() ? (mode === "format" ? formatJson(input) : compressJson(input)) : emptyResult),
    [input, mode]
  );

  return (
    <section className="tool-panel" aria-labelledby="json-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="json-tool-heading">JSON workbench</h2>
          <p>Format or compress JSON locally. Invalid JSON stays in the browser and shows a readable parser error.</p>
        </div>
        <div className="tool-panel-header-meta">
          {statusSlot}
          <div className="tool-actions">
            <Button
              aria-pressed={mode === "format"}
              onPress={() => setMode("format")}
              variant={mode === "format" ? "primary" : "secondary"}
            >
              Format
            </Button>
            <Button
              aria-pressed={mode === "compress"}
              onPress={() => setMode("compress")}
              variant={mode === "compress" ? "primary" : "secondary"}
            >
              Compress
            </Button>
            <CopyButton disabled={!result.ok} value={result.output} />
          </div>
        </div>
      </div>

      <div className="tool-grid">
        <Textarea className="tool-textarea" label="Input" onChange={(event) => setInput(event.target.value)} placeholder="Paste JSON here" spellCheck={false} value={input} />
        <Textarea className="tool-textarea" label="Output" readOnly spellCheck={false} value={result.ok ? result.output : ""} />
      </div>
      {!result.ok ? (
        <Alert status="danger"><Alert.Content><Alert.Description>{result.error}</Alert.Description></Alert.Content></Alert>
      ) : null}
    </section>
  );
}
