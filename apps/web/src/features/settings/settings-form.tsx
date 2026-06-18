"use client";

import { useCallback, useState } from "react";
import { getSettings, updateSettings } from "@/shared/api/settings";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { Alert, Button, Card, Input, Skeleton, StatusChip } from "@weopen/ui";

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
  const [vercelApiToken, setVercelApiToken] = useState("");
  const [secrets, setSecrets] = useState<SecretSummary[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSettings = useCallback(() => {
    let isMounted = true;
    void getSettings()
      .then((result) => {
        if (!isMounted) return;
        setSecrets(result.secrets);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setMessage(error instanceof Error ? error.message : "设置读取失败");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useRouteRefresh({
    pathname: "/settings",
    refresh: loadSettings
  });

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
      setSecrets(result.secrets);
      setR2AccessKeyId("");
      setR2SecretAccessKey("");
      setCloudflareApiToken("");
      setVercelApiToken("");
      setMessage(`Saved ${result.secrets.length} secret summaries.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="settings-card">
      <Card.Header>
        <Card.Title>Provider Secrets</Card.Title>
        <StatusChip tone={secrets.length ? "success" : "neutral"}>{secrets.length} saved</StatusChip>
      </Card.Header>
      <Card.Content>
        <form className="settings-form" onSubmit={onSubmit}>
          <Input label="R2 Access Key ID" name="r2AccessKeyId" onChange={(event) => setR2AccessKeyId(event.target.value)} type="password" value={r2AccessKeyId} />
          <Input label="R2 Secret Access Key" name="r2SecretAccessKey" onChange={(event) => setR2SecretAccessKey(event.target.value)} type="password" value={r2SecretAccessKey} />
          <Input label="Cloudflare API Token" name="cloudflareApiToken" onChange={(event) => setCloudflareApiToken(event.target.value)} type="password" value={cloudflareApiToken} />
          <Input label="Vercel API Token" name="vercelApiToken" onChange={(event) => setVercelApiToken(event.target.value)} type="password" value={vercelApiToken} />
          <p className="settings-help-text">Secret values are sent once and only redacted summaries return to the browser.</p>
          <Button isPending={isSubmitting} type="submit" variant="secondary">
            {isSubmitting ? "Saving" : "Save secrets"}
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
          {isLoading ? (
            <>
              <div><dt><Skeleton as="span" height={12} radius="pill" width={126} /></dt><dd><Skeleton as="span" height={12} radius="pill" width="72%" /></dd></div>
              <div><dt><Skeleton as="span" height={12} radius="pill" width={152} /></dt><dd><Skeleton as="span" height={12} radius="pill" width="58%" /></dd></div>
            </>
          ) : secrets.length ? secrets.map((secret) => (
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
