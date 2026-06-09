import { apiBaseUrl, apiUrl } from "./base";

export type HealthResponse = {
  status: string;
  service: string;
};

export async function fetchApiHealth(baseUrl = apiBaseUrl()): Promise<HealthResponse> {
  const path = baseUrl ? `${baseUrl}/healthz` : apiUrl("/api/healthz");
  const response = await fetch(path, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
