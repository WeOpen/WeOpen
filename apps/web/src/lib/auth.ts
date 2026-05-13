type LoginInput = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("邮箱或密码错误");
  }

  return response.json() as Promise<LoginResponse>;
}

export async function currentUser(token?: string) {
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include"
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
