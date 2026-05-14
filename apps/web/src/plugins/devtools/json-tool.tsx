"use client";

import { useMemo, useState } from "react";
import { Button } from "@weopen/ui";
import { compressJson, formatJson } from "./tools";
import { CopyButton } from "./copy-button";

type JsonMode = "format" | "compress";

export function JsonTool() {
  const [input, setInput] = useState('{"project":"WeOpen","plugins":["blog","storage","devtools"]}');
  const [mode, setMode] = useState<JsonMode>("format");
  const result = useMemo(
    () => (mode === "format" ? formatJson(input) : compressJson(input)),
    [input, mode]
  );

  return (
    <section className="tool-panel" aria-labelledby="json-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="json-tool-heading">JSON workbench</h2>
          <p>Format or compress JSON locally. Invalid JSON stays in the browser and shows a readable parser error.</p>
        </div>
        <div className="tool-actions">
          <Button
            aria-pressed={mode === "format"}
            onClick={() => setMode("format")}
            variant={mode === "format" ? "primary" : "secondary"}
          >
            Format
          </Button>
          <Button
            aria-pressed={mode === "compress"}
            onClick={() => setMode("compress")}
            variant={mode === "compress" ? "primary" : "secondary"}
          >
            Compress
          </Button>
          <CopyButton disabled={!result.ok} value={result.output} />
        </div>
      </div>

      <div className="tool-grid">
        <label className="tool-field">
          <span>Input</span>
          <textarea
            className="ui-textarea tool-textarea"
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            value={input}
          />
        </label>
        <label className="tool-field">
          <span>Output</span>
          <textarea
            className="ui-textarea tool-textarea"
            readOnly
            spellCheck={false}
            value={result.ok ? result.output : ""}
          />
        </label>
      </div>
      {!result.ok ? (
        <p className="tool-error" role="alert">
          {result.error}
        </p>
      ) : null}
    </section>
  );
}
