"use client";

import { useState } from "react";
import { Button, Card, Input, SelectField, Textarea } from "@weopen/ui";
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
        <Textarea className="tool-textarea tool-textarea-short" label="Input text" onChange={(event) => setInput(event.target.value)} spellCheck={false} value={input} />
        <Card className="tool-card">
          <SelectField
            label="Algorithm"
            onChange={(value) => setAlgorithm(value as HashAlgorithm)}
            options={hashAlgorithms.map((nextAlgorithm) => ({ label: nextAlgorithm, value: nextAlgorithm }))}
            value={algorithm}
          />
          <Input label="HMAC secret" onChange={(event) => setSecret(event.target.value)} type="password" value={secret} />
        </Card>
      </div>

      <div className="tool-grid">
        <Card className="tool-card">
          <div className="tool-card-header">
            <strong>Digest</strong>
            <div className="tool-actions">
              <Button disabled={isRunning} onPress={runHash}>
                Hash
              </Button>
              <CopyButton disabled={!hashResult.ok} value={hashResult.output} />
            </div>
          </div>
          <code className="tool-output-block">{hashResult.ok ? hashResult.output : ""}</code>
          {!hashResult.ok ? <p className="tool-error">{hashResult.error}</p> : null}
        </Card>

        <Card className="tool-card">
          <div className="tool-card-header">
            <strong>HMAC</strong>
            <div className="tool-actions">
              <Button disabled={isRunning} onPress={runHmac}>
                Sign
              </Button>
              <CopyButton disabled={!hmacResult.ok} value={hmacResult.output} />
            </div>
          </div>
          <code className="tool-output-block">{hmacResult.ok ? hmacResult.output : ""}</code>
          {!hmacResult.ok ? <p className="tool-error">{hmacResult.error}</p> : null}
        </Card>
      </div>
    </section>
  );
}
