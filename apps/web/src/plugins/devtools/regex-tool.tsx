"use client";

import { useMemo, useState } from "react";
import { testRegex } from "./tools";
import { CopyButton } from "./copy-button";

export function RegexTool() {
  const [pattern, setPattern] = useState("(?<plugin>blog|storage|devtools)");
  const [flags, setFlags] = useState("gi");
  const [input, setInput] = useState("Blog, storage, and Devtools are built-in plugins.");
  const result = useMemo(() => testRegex(pattern, flags, input), [flags, input, pattern]);

  return (
    <section className="tool-panel" aria-labelledby="regex-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="regex-tool-heading">Regex tester</h2>
          <p>Run JavaScript regular expressions locally and inspect match indexes plus named capture groups.</p>
        </div>
        <CopyButton disabled={!result.ok} value={result.output} />
      </div>

      <div className="tool-grid">
        <div className="tool-card">
          <label className="tool-field">
            <span>Pattern</span>
            <input
              className="ui-input"
              onChange={(event) => setPattern(event.target.value)}
              spellCheck={false}
              value={pattern}
            />
          </label>
          <label className="tool-field">
            <span>Flags</span>
            <input
              className="ui-input"
              onChange={(event) => setFlags(event.target.value)}
              spellCheck={false}
              value={flags}
            />
          </label>
        </div>
        <label className="tool-field">
          <span>Sample text</span>
          <textarea
            className="ui-textarea tool-textarea"
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            value={input}
          />
        </label>
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
