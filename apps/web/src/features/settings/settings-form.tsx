"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/shared/api/settings";
import { Alert, Button, Card, Input } from "@weopen/ui";

type SecretSummary = {
  id: string;
  provider: string;
  name: string;
  last4: string;
  updatedAt: string;
};

export function SettingsForm() {
  const [r2AccessKeyId, setR2AccessKeyId] = useState("");
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState("");
  const [cloudflareApiToken, setCloudflareApiToken] = useState("");
  const [secrets, setSecrets] = useState<SecretSummary[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void getSettings()
      .then((result) => {
        if (!isMounted) return;
        setSecrets(result.secrets);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setMessage(error instanceof Error ? error.message : "设置读取失败");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await updateSettings({
        cloudflareApiToken,
        r2AccessKeyId,
        r2SecretAccessKey
      });
      setSecrets(result.secrets);
      setMessage(`Saved ${result.secrets.length} secret summaries.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="settings-card">
      <Card.Header><Card.Title>Provider Secrets</Card.Title></Card.Header>
      <Card.Content>
        <form className="settings-form" onSubmit={onSubmit}>
          <Input label="R2 Access Key ID" name="r2AccessKeyId" onChange={(event) => setR2AccessKeyId(event.target.value)} type="password" value={r2AccessKeyId} />
          <Input label="R2 Secret Access Key" name="r2SecretAccessKey" onChange={(event) => setR2SecretAccessKey(event.target.value)} type="password" value={r2SecretAccessKey} />
          <Input label="Cloudflare API Token" name="cloudflareApiToken" onChange={(event) => setCloudflareApiToken(event.target.value)} type="password" value={cloudflareApiToken} />
          <Button isPending={isSubmitting} type="submit" variant="secondary">
            {isSubmitting ? "Saving" : "Save"}
          </Button>
          {message ? (
            <Alert status={message.includes("Saved") ? "success" : "danger"}>
              <Alert.Content>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </form>
        <dl className="settings-kv-list">
          {secrets.length ? secrets.map((secret) => (
            <div key={secret.id}>
              <dt>{secret.provider}.{secret.name}</dt>
              <dd>••••{secret.last4} · {new Date(secret.updatedAt).toLocaleString()}</dd>
            </div>
          )) : (
            <div><dt>Saved secrets</dt><dd>No provider secrets saved yet</dd></div>
          )}
        </dl>
      </Card.Content>
    </Card>
  );
}
