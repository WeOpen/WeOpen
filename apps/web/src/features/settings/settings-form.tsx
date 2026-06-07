"use client";

import { useState } from "react";
import { updateSettings } from "@/shared/api/settings";
import { Alert, Button, Card, Input, SelectField } from "@weopen/ui";

export function SettingsForm() {
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.weopen.local");
  const [webOrigin, setWebOrigin] = useState("https://app.weopen.local");
  const [environment, setEnvironment] = useState("production");
  const [timezone, setTimezone] = useState("UTC");
  const [r2AccessKeyId, setR2AccessKeyId] = useState("");
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState("");
  const [cloudflareApiToken, setCloudflareApiToken] = useState("");
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
        r2SecretAccessKey
      });
      setMessage(`Saved ${result.secrets.length} secret summaries.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="settings-card">
      <Card.Header><Card.Title>Application</Card.Title></Card.Header>
      <Card.Content>
        <form className="settings-form" onSubmit={onSubmit}>
          <Input label="API Base URL" name="apiBaseUrl" onChange={(event) => setApiBaseUrl(event.target.value)} value={apiBaseUrl} />
          <Input label="Web Origin" name="webOrigin" onChange={(event) => setWebOrigin(event.target.value)} value={webOrigin} />
          <SelectField
            label="Environment"
            name="environment"
            onChange={setEnvironment}
            options={[{ label: "Production", value: "production" }, { label: "Local", value: "local" }]}
            value={environment}
          />
          <SelectField
            label="Timezone"
            name="timezone"
            onChange={setTimezone}
            options={[{ label: "UTC", value: "UTC" }, { label: "Asia/Shanghai", value: "Asia/Shanghai" }]}
            value={timezone}
          />
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
      </Card.Content>
    </Card>
  );
}
