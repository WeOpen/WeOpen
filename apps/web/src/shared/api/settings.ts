// Settings calls send secret values to the API once; the browser only receives redacted metadata back.
import { apiUrl } from "./base";

type UpdateSettingsInput = {
  cloudflareApiToken?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  vercelApiToken?: string;
};

type SettingsResponse = {
  secrets: Array<{
    id: string;
    provider: string;
    name: string;
    last4: string;
    updatedAt: string;
  }>;
};


/** updateSettings writes provider secrets through the authenticated API settings boundary. */
export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsResponse> {
  const response = await fetch(apiUrl("/api/settings"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("保存设置失败，请确认已登录。");
  }

  return response.json() as Promise<SettingsResponse>;
}
