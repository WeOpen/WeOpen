"use client";

import { useState } from "react";
import { Button } from "@weopen/ui";
import { generateUuid } from "./tools";
import { CopyButton } from "./copy-button";

export function UuidTool() {
  const [uuid, setUuid] = useState(() => generateUuid());

  return (
    <section className="tool-panel" aria-labelledby="uuid-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="uuid-tool-heading">UUID generator</h2>
          <p>Generate RFC 4122 version 4 IDs with browser crypto, with a local fallback for older runtimes.</p>
        </div>
        <div className="tool-actions">
          <Button onPress={() => setUuid(generateUuid())}>Generate</Button>
          <CopyButton value={uuid} />
        </div>
      </div>
      <div className="tool-big-token">{uuid}</div>
    </section>
  );
}
