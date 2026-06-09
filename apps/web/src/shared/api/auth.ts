// Browser auth calls go through the Web same-origin API proxy, which owns browser cookies and redacts raw tokens.
import { apiUrl } from "./base";

type LoginInput = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  roles?: string[];
  permissions?: string[];
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LoginResponse = {
  expiresAt: string;
  user: AuthUser;
};

type CurrentUserResponse = {
  user: AuthUser;
};


/** login starts an API session and stores the HttpOnly cookie set by the server. */
export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "邮箱或密码错误"));
  }

  return response.json() as Promise<LoginResponse>;
}

/** currentUser reads the active API session and returns null for unauthenticated browsers. */
export async function currentUser(token?: string): Promise<CurrentUserResponse | null> {
  const response = await fetch(apiUrl("/api/me"), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<CurrentUserResponse>;
}

/** logout clears the API-owned session cookie and server-side token hash. */
export async function logout(): Promise<void> {
  await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });
}

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}
