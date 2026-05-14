"use client";

import { useState } from "react";
import { Button } from "@weopen/ui";
import type { ToolResult } from "./types";
import { hashAlgorithms, hashText, hmacText, type HashAlgorithm } from "./tools";
import { CopyButton } from "./copy-button";

const emptyResult: ToolResult = { ok: true, output: "" };

export function HashTool() {
  const [input, setInput] = useState("hello");
  const [secret, setSecret] = useState("secret");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [hashResult, setHashResult] = useState<ToolResult>(emptyResult);
  const [hmacResult, setHmacResult] = useState<ToolResult>(emptyResult);
  const [isRunning, setIsRunning] = useState(false);

  async function runHash() {
    setIsRunning(true);
    try {
      setHashResult(await hashText(input, algorithm));
    } finally {
      setIsRunning(false);
    }
  }

  async function runHmac() {
    setIsRunning(true);
    try {
      setHmacResult(await hmacText(input, secret, algorithm));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="tool-panel" aria-labelledby="hash-tool-heading">
      <div className="tool-panel-header">
        <div>
          <h2 id="hash-tool-heading">Hash and HMAC</h2>
          <p>Use Web Crypto for SHA digests and keyed HMAC signatures. Secret values stay in memory only.</p>
        </div>
      </div>

      <div className="tool-grid">
        <label className="tool-field">
          <span>Input text</span>
          <textarea
            className="ui-textarea tool-textarea tool-textarea-short"
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            value={input}
          />
        </label>
        <div className="tool-card">
          <label className="tool-field">
            <span>Algorithm</span>
            <select
              className="ui-input"
              onChange={(event) => setAlgorithm(event.target.value as HashAlgorithm)}
              value={algorithm}
            >
              {hashAlgorithms.map((nextAlgorithm) => (
                <option key={nextAlgorithm} value={nextAlgorithm}>
                  {nextAlgorithm}
                </option>
              ))}
            </select>
          </label>
          <label className="tool-field">
            <span>HMAC secret</span>
            <input
              className="ui-input"
              onChange={(event) => setSecret(event.target.value)}
              type="password"
              value={secret}
            />
          </label>
        </div>
      </div>

      <div className="tool-grid">
        <div className="tool-card">
          <div className="tool-card-header">
            <strong>Digest</strong>
            <div className="tool-actions">
              <Button disabled={isRunning} onClick={runHash}>
                Hash
              </Button>
              <CopyButton disabled={!hashResult.ok} value={hashResult.output} />
            </div>
          </div>
          <code className="tool-output-block">{hashResult.ok ? hashResult.output : ""}</code>
          {!hashResult.ok ? <p className="tool-error">{hashResult.error}</p> : null}
        </div>

        <div className="tool-card">
          <div className="tool-card-header">
            <strong>HMAC</strong>
            <div className="tool-actions">
              <Button disabled={isRunning} onClick={runHmac}>
                Sign
              </Button>
              <CopyButton disabled={!hmacResult.ok} value={hmacResult.output} />
            </div>
          </div>
          <code className="tool-output-block">{hmacResult.ok ? hmacResult.output : ""}</code>
          {!hmacResult.ok ? <p className="tool-error">{hmacResult.error}</p> : null}
        </div>
      </div>
    </section>
  );
}
