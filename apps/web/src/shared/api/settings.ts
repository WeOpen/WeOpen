// Settings calls send secret values to the API once; the browser only receives redacted metadata back.
import { apiFetch, ensureApiResponse } from "./base";

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

type SettingsWireResponse = {
  secrets?: SettingsResponse["secrets"] | null;
};


/** getSettings reads redacted provider secret summaries. */
export async function getSettings(): Promise<SettingsResponse> {
  const response = await apiFetch("/api/settings", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "设置读取失败");
  const body = (await response.json()) as SettingsWireResponse;
  return normalizeSettingsResponse(body);
}

/** updateSettings writes provider secrets through the authenticated API settings boundary. */
export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsResponse> {
  const response = await apiFetch("/api/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(input)
  });

  await ensureApiResponse(response, "保存设置失败，请确认已登录。");

  const body = (await response.json()) as SettingsWireResponse;
  return normalizeSettingsResponse(body);
}

function normalizeSettingsResponse(body: SettingsWireResponse): SettingsResponse {
  return {
    secrets: Array.isArray(body.secrets) ? body.secrets : []
  };
}
