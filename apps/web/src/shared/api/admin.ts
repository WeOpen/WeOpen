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

type UsersResponse = { users?: AuthUser[] | null };
type RolesResponse = { roles?: AdminRole[] | null };
type SessionsResponse = { sessions?: AdminSession[] | null };
type UserResponse = { user: AuthUser };

export async function listUsers(): Promise<AuthUser[]> {
  const response = await apiFetch("/api/admin/users", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "用户列表读取失败");
  const body = (await response.json()) as UsersResponse;
  return Array.isArray(body.users) ? body.users.map(normalizeAuthUser) : [];
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
  return normalizeAuthUser(body.user);
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
  return normalizeAuthUser(body.user);
}

export async function listRoles(): Promise<AdminRole[]> {
  const response = await apiFetch("/api/admin/roles", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "角色列表读取失败");
  const body = (await response.json()) as RolesResponse;
  return Array.isArray(body.roles) ? body.roles.map(normalizeRole) : [];
}

export async function listSessions(userId?: string): Promise<AdminSession[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const response = await apiFetch(`/api/admin/sessions${query}`, {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "会话列表读取失败");
  const body = (await response.json()) as SessionsResponse;
  return Array.isArray(body.sessions) ? body.sessions : [];
}

export async function revokeSession(sessionId: string): Promise<void> {
  const response = await apiFetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE"
  });
  await ensureApiResponse(response, "会话撤销失败");
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    roles: Array.isArray(user.roles) ? user.roles : []
  };
}

function normalizeRole(role: AdminRole): AdminRole {
  return {
    ...role,
    permissions: Array.isArray(role.permissions) ? role.permissions : []
  };
}
