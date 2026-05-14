"use client";

import { useState } from "react";
import { Button, Input } from "@weopen/ui";
import { updateSettings } from "@/shared/api/settings";

export function SettingsForm() {
  const [cloudflareApiToken, setCloudflareApiToken] = useState("");
  const [r2AccessKeyId, setR2AccessKeyId] = useState("");
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState("");
  const [vercelApiToken, setVercelApiToken] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await updateSettings({
        cloudflareApiToken,
        r2AccessKeyId,
        r2SecretAccessKey,
        vercelApiToken
      });
      setMessage(`已保存 ${result.secrets.length} 个密钥摘要。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={onSubmit}>
      <Input
        label="Cloudflare API Token"
        name="cloudflareApiToken"
        onChange={(event) => setCloudflareApiToken(event.target.value)}
        type="password"
        value={cloudflareApiToken}
      />
      <Input
        label="R2 Access Key ID"
        name="r2AccessKeyId"
        onChange={(event) => setR2AccessKeyId(event.target.value)}
        type="password"
        value={r2AccessKeyId}
      />
      <Input
        label="R2 Secret Access Key"
        name="r2SecretAccessKey"
        onChange={(event) => setR2SecretAccessKey(event.target.value)}
        type="password"
        value={r2SecretAccessKey}
      />
      <Input
        label="Vercel API Token"
        name="vercelApiToken"
        onChange={(event) => setVercelApiToken(event.target.value)}
        type="password"
        value={vercelApiToken}
      />
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "保存中" : "保存设置"}
      </Button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
