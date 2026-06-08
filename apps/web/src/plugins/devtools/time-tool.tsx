"use client";

import { useMemo, useState } from "react";
import { Input } from "@weopen/ui";
import { convertDateToTimestamp, convertTimestampToDate } from "./tools";
import { CopyButton } from "./copy-button";

export function TimeTool() {
  const now = new Date();
  const [timestamp, setTimestamp] = useState(String(now.getTime()));
  const [date, setDate] = useState(now.toISOString());
  const timestampResult = useMemo(() => convertTimestampToDate(timestamp), [timestamp]);
  const dateResult = useMemo(() => convertDateToTimestamp(date), [date]);

  return (
    <section className="tool-panel" aria-labelledby="time-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="time-tool-heading">Timestamp converter</h2>
          <p>Convert Unix seconds or milliseconds into ISO 8601, and parse dates back to milliseconds.</p>
        </div>
      </div>

      <div className="tool-grid">
        <div className="tool-card">
          <Input label="Unix timestamp" onChange={(event) => setTimestamp(event.target.value)} value={timestamp} />
          <div className="tool-result-row">
            <code>{timestampResult.ok ? timestampResult.output : "Invalid timestamp"}</code>
            <CopyButton disabled={!timestampResult.ok} value={timestampResult.output} />
          </div>
          {!timestampResult.ok ? (
            <p className="tool-error" role="alert">
              {timestampResult.error}
            </p>
          ) : null}
        </div>

        <div className="tool-card">
          <Input label="Date or ISO string" onChange={(event) => setDate(event.target.value)} value={date} />
          <div className="tool-result-row">
            <code>{dateResult.ok ? dateResult.output : "Invalid date"}</code>
            <CopyButton disabled={!dateResult.ok} value={dateResult.output} />
          </div>
          {!dateResult.ok ? (
            <p className="tool-error" role="alert">
              {dateResult.error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
