export type HealthResponse = {
  status: string;
  service: string;
};

export async function fetchApiHealth(
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
): Promise<HealthResponse> {
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/healthz`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`API health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
