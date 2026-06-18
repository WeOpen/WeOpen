"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Card, Input } from "@weopen/ui";
import { convertDateToTimestamp, convertTimestampToDate } from "./tools";
import { CopyButton } from "./copy-button";
import type { ToolResult } from "./types";

const emptyResult: ToolResult = { ok: true, output: "" };

export function TimeTool({ statusSlot }: { statusSlot?: ReactNode }) {
  const [timestamp, setTimestamp] = useState("");
  const [date, setDate] = useState("");
  const timestampResult = useMemo(() => (timestamp.trim() ? convertTimestampToDate(timestamp) : emptyResult), [timestamp]);
  const dateResult = useMemo(() => (date.trim() ? convertDateToTimestamp(date) : emptyResult), [date]);

  return (
    <section className="tool-panel" aria-labelledby="time-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="time-tool-heading">Timestamp converter</h2>
          <p>Convert Unix seconds or milliseconds into ISO 8601, and parse dates back to milliseconds.</p>
        </div>
        {statusSlot ? <div className="tool-panel-header-meta">{statusSlot}</div> : null}
      </div>

      <div className="tool-grid">
        <Card className="tool-card">
          <Input label="Unix timestamp" onChange={(event) => setTimestamp(event.target.value)} placeholder="Seconds or milliseconds" value={timestamp} />
          <div className="tool-result-row">
            <code>{timestampResult.ok ? timestampResult.output : "Invalid timestamp"}</code>
            <CopyButton disabled={!timestampResult.ok} value={timestampResult.output} />
          </div>
          {!timestampResult.ok ? (
            <p className="tool-error" role="alert">
              {timestampResult.error}
            </p>
          ) : null}
        </Card>

        <Card className="tool-card">
          <Input label="Date or ISO string" onChange={(event) => setDate(event.target.value)} placeholder="Date or ISO string" value={date} />
          <div className="tool-result-row">
            <code>{dateResult.ok ? dateResult.output : "Invalid date"}</code>
            <CopyButton disabled={!dateResult.ok} value={dateResult.output} />
          </div>
          {!dateResult.ok ? (
            <p className="tool-error" role="alert">
              {dateResult.error}
            </p>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
