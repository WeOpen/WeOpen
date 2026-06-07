"use client";

import { useMemo, useState } from "react";
import { decodeJwt } from "./tools";
import { CopyButton } from "./copy-button";
import { Alert, Textarea } from "@weopen/ui";

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
        <Textarea className="tool-textarea" label="JWT" onChange={(event) => setToken(event.target.value)} spellCheck={false} value={token} />
        <Textarea className="tool-textarea" label="Decoded JSON" readOnly spellCheck={false} value={result.ok ? result.output : ""} />
      </div>
      <p className="tool-note">Decode-only: signature verification is intentionally out of scope for this client-side tool.</p>
      {!result.ok ? (
        <Alert status="danger"><Alert.Content><Alert.Description>{result.error}</Alert.Description></Alert.Content></Alert>
      ) : null}
    </section>
  );
}
