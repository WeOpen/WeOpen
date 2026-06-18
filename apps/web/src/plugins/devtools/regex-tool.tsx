"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Card, Input, Textarea } from "@weopen/ui";
import { testRegex } from "./tools";
import { CopyButton } from "./copy-button";

export function RegexTool({ statusSlot }: { statusSlot?: ReactNode }) {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("");
  const result = useMemo(
    () => (pattern && input ? testRegex(pattern, flags, input) : { ok: true as const, matches: [], output: "" }),
    [flags, input, pattern]
  );

  return (
    <section className="tool-panel" aria-labelledby="regex-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="regex-tool-heading">Regex tester</h2>
          <p>Run JavaScript regular expressions locally and inspect match indexes plus named capture groups.</p>
        </div>
        <div className="tool-panel-header-meta">
          {statusSlot}
          <div className="tool-actions">
            <CopyButton disabled={!result.ok} value={result.output} />
          </div>
        </div>
      </div>

      <div className="tool-grid">
        <Card className="tool-card">
          <Input label="Pattern" onChange={(event) => setPattern(event.target.value)} placeholder="Regular expression" spellCheck={false} value={pattern} />
          <Input label="Flags" onChange={(event) => setFlags(event.target.value)} spellCheck={false} value={flags} />
        </Card>
        <Textarea className="tool-textarea" label="Sample text" onChange={(event) => setInput(event.target.value)} placeholder="Paste text to match" spellCheck={false} value={input} />
      </div>

      <div className="tool-results-list">
        {result.ok && result.matches.length ? (
          result.matches.map((match) => (
            <div className="tool-match" key={`${match.index}-${match.value}`}>
              <strong>{match.value}</strong>
              <span>index {match.index}</span>
              {match.groups ? <code>{JSON.stringify(match.groups)}</code> : null}
            </div>
          ))
        ) : (
          <p className={result.ok ? "tool-note" : "tool-error"}>
            {result.ok ? "No matches" : result.error}
          </p>
        )}
      </div>
    </section>
  );
}
