// Browser auth calls go through the Web same-origin API proxy, which owns browser cookies and redacts raw tokens.
import { apiErrorFromResponse, apiFetch, clearCSRFToken } from "./base";

type LoginInput = {
  email: string;
  password: string;
  totpCode?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  roles?: string[];
  permissions?: string[];
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
  passwordChangedAt?: string;
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
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await apiErrorFromResponse(response, "登录服务暂时不可用，请稍后重试");
  }

  return response.json() as Promise<LoginResponse>;
}

/** currentUser reads the active API session and returns null for unauthenticated browsers. */
export async function currentUser(token?: string): Promise<CurrentUserResponse | null> {
  const response = await apiFetch("/api/me", {
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
  await apiFetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });
  clearCSRFToken();
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  const response = await apiFetch("/api/auth/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw await apiErrorFromResponse(response, "密码修改失败");
  }
}

export async function beginMFAEnrollment(input: { currentPassword: string }): Promise<{ secret: string; otpauthUrl: string }> {
  const response = await apiFetch("/api/auth/mfa/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw await apiErrorFromResponse(response, "MFA 初始化失败");
  }
  return response.json() as Promise<{ secret: string; otpauthUrl: string }>;
}

export async function verifyMFAEnrollment(input: { code: string }): Promise<void> {
  const response = await apiFetch("/api/auth/mfa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw await apiErrorFromResponse(response, "MFA 验证失败");
  }
}

export async function disableMFA(input: { currentPassword: string }): Promise<void> {
  const response = await apiFetch("/api/auth/mfa", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw await apiErrorFromResponse(response, "MFA 关闭失败");
  }
}

export function hasPermission(user: AuthUser | null | undefined, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(user: AuthUser | null | undefined, permissions: readonly string[]): boolean {
  return permissions.length === 0 || permissions.some((permission) => hasPermission(user, permission));
}
