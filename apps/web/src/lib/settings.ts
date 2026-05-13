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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
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
