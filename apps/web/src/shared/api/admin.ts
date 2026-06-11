import { apiFetch, ensureApiResponse } from "./base";
import type { AuthUser } from "./auth";

export type AdminRole = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSession = {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

type UsersResponse = { users: AuthUser[] };
type RolesResponse = { roles: AdminRole[] };
type SessionsResponse = { sessions: AdminSession[] };
type UserResponse = { user: AuthUser };

export async function listUsers(): Promise<AuthUser[]> {
  const response = await apiFetch("/api/admin/users", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "用户列表读取失败");
  const body = (await response.json()) as UsersResponse;
  return body.users;
}

export async function createUser(input: {
  email: string;
  displayName: string;
  password: string;
  roles: string[];
}): Promise<AuthUser> {
  const response = await apiFetch("/api/admin/users", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  await ensureApiResponse(response, "用户创建失败");
  const body = (await response.json()) as UserResponse;
  return body.user;
}

export async function updateUser(
  userId: string,
  input: { displayName?: string; status?: string; roles?: string[] }
): Promise<AuthUser> {
  const response = await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  await ensureApiResponse(response, "用户更新失败");
  const body = (await response.json()) as UserResponse;
  return body.user;
}

export async function listRoles(): Promise<AdminRole[]> {
  const response = await apiFetch("/api/admin/roles", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "角色列表读取失败");
  const body = (await response.json()) as RolesResponse;
  return body.roles;
}

export async function listSessions(userId?: string): Promise<AdminSession[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const response = await apiFetch(`/api/admin/sessions${query}`, {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "会话列表读取失败");
  const body = (await response.json()) as SessionsResponse;
  return body.sessions;
}

export async function revokeSession(sessionId: string): Promise<void> {
  const response = await apiFetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE"
  });
  await ensureApiResponse(response, "会话撤销失败");
}
