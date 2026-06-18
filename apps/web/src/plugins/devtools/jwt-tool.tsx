"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { decodeJwt } from "./tools";
import { CopyButton } from "./copy-button";
import { Alert, Textarea } from "@weopen/ui";

const emptyResult = { ok: true, header: {}, payload: {}, signature: "", output: "" } as const;

export function JwtTool({ statusSlot }: { statusSlot?: ReactNode }) {
  const [token, setToken] = useState("");
  const result = useMemo(() => (token.trim() ? decodeJwt(token) : emptyResult), [token]);

  return (
    <section className="tool-panel" aria-labelledby="jwt-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="jwt-tool-heading">JWT decoder</h2>
          <p>Decode header and payload only. This tool never verifies signatures and must not be used as an auth decision.</p>
        </div>
        <div className="tool-panel-header-meta">
          {statusSlot}
          <div className="tool-actions">
            <CopyButton disabled={!result.ok} value={result.output} />
          </div>
        </div>
      </div>

      <div className="tool-grid">
        <Textarea className="tool-textarea" label="JWT" onChange={(event) => setToken(event.target.value)} placeholder="Paste a JWT here" spellCheck={false} value={token} />
        <Textarea className="tool-textarea" label="Decoded JSON" readOnly spellCheck={false} value={result.ok ? result.output : ""} />
      </div>
      <p className="tool-note">Decode-only: signature verification is intentionally out of scope for this client-side tool.</p>
      {!result.ok ? (
        <Alert status="danger"><Alert.Content><Alert.Description>{result.error}</Alert.Description></Alert.Content></Alert>
      ) : null}
    </section>
  );
}
