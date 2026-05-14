"use client";

import { useMemo, useState } from "react";
import { decodeJwt } from "./tools";
import { CopyButton } from "./copy-button";

const sampleJwt = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJyb2xlcyI6WyJhZG1pbiJdfQ.";

export function JwtTool() {
  const [token, setToken] = useState(sampleJwt);
  const result = useMemo(() => decodeJwt(token), [token]);

  return (
    <section className="tool-panel" aria-labelledby="jwt-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="jwt-tool-heading">JWT decoder</h2>
          <p>Decode header and payload only. This tool never verifies signatures and must not be used as an auth decision.</p>
        </div>
        <CopyButton disabled={!result.ok} value={result.output} />
      </div>

      <div className="tool-grid">
        <label className="tool-field">
          <span>JWT</span>
          <textarea
            className="ui-textarea tool-textarea"
            onChange={(event) => setToken(event.target.value)}
            spellCheck={false}
            value={token}
          />
        </label>
        <label className="tool-field">
          <span>Decoded JSON</span>
          <textarea
            className="ui-textarea tool-textarea"
            readOnly
            spellCheck={false}
            value={result.ok ? result.output : ""}
          />
        </label>
      </div>
      <p className="tool-note">Decode-only: signature verification is intentionally out of scope for this client-side tool.</p>
      {!result.ok ? (
        <p className="tool-error" role="alert">
          {result.error}
        </p>
      ) : null}
    </section>
  );
}
