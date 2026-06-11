"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createUser, listRoles, listSessions, listUsers, revokeSession, updateUser, type AdminRole, type AdminSession } from "@/shared/api/admin";
import { currentUser, hasPermission, type AuthUser } from "@/shared/api/auth";
import { Alert, Button, Card, Input, StatusChip } from "@weopen/ui";

export function AdminAccessPanel() {
  const [current, setCurrent] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    roles: "admin"
  });

  const canManageUsers = hasPermission(current, "user:manage");
  const roleNames = useMemo(() => roles.map((role) => role.name), [roles]);

  useEffect(() => {
    let isMounted = true;
    void currentUser().then((result) => {
      if (!isMounted) return;
      setCurrent(result?.user ?? null);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const refresh = useCallback(async (clearMessage = true) => {
    if (clearMessage) {
      setMessage("");
    }
    const [nextUsers, nextRoles, nextSessions] = await Promise.all([listUsers(), listRoles(), listSessions()]);
    setUsers(nextUsers);
    setRoles(nextRoles);
    setSessions(nextSessions.map(toSessionView));
  }, []);

  useEffect(() => {
    if (!canManageUsers) return;
    let isMounted = true;
    void Promise.all([listUsers(), listRoles(), listSessions()])
      .then(([nextUsers, nextRoles, nextSessions]) => {
        if (!isMounted) return;
        setUsers(nextUsers);
        setRoles(nextRoles);
        setSessions(nextSessions.map(toSessionView));
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setMessage(err instanceof Error ? err.message : "Access control loading failed");
      });
    return () => {
      isMounted = false;
    };
  }, [canManageUsers]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageUsers) return;
    setIsBusy(true);
    setMessage("");
    try {
      await createUser({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        roles: form.roles.split(",").map((role) => role.trim()).filter(Boolean)
      });
      setForm({ displayName: "", email: "", password: "", roles: roleNames[0] ?? "admin" });
      await refresh(false);
      setMessage("User created. First login will require password change.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "User create failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function onToggleStatus(user: AuthUser) {
    setIsBusy(true);
    setMessage("");
    try {
      await updateUser(user.id, { status: user.status === "active" ? "disabled" : "active" });
      await refresh(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "User update failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function onRevokeSession(sessionId: string) {
    setIsBusy(true);
    setMessage("");
    try {
      await revokeSession(sessionId);
      await refresh(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Session revoke failed");
    } finally {
      setIsBusy(false);
    }
  }

  if (!canManageUsers) {
    return (
      <Card className="settings-session-card">
        <Card.Header><Card.Title>Access Control</Card.Title></Card.Header>
        <Card.Content>
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>当前账号没有 user:manage 权限，用户/会话管理以只读禁用态隐藏。</Alert.Description>
            </Alert.Content>
          </Alert>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="settings-session-card">
      <Card.Header><Card.Title>Access Control</Card.Title></Card.Header>
      <Card.Content>
        <form className="settings-form" onSubmit={onCreate}>
          <Input label="New user email" name="email" onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required type="email" value={form.email} />
          <Input label="Display name" name="displayName" onChange={(event) => setForm((value) => ({ ...value, displayName: event.target.value }))} value={form.displayName} />
          <Input label="Temporary password" name="password" onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required type="password" value={form.password} />
          <Input label="Roles (comma separated)" name="roles" onChange={(event) => setForm((value) => ({ ...value, roles: event.target.value }))} value={form.roles} />
          <Button isPending={isBusy} type="submit" variant="secondary">Create user</Button>
        </form>

        {message ? (
          <Alert status={message.includes("failed") || message.includes("失败") ? "danger" : "success"}>
            <Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content>
          </Alert>
        ) : null}

        <div className="settings-provider-list" aria-label="Users">
          {users.map((user) => (
            <div key={user.id}>
              <span>{user.displayName || user.email}</span>
              <strong><i /> {user.status.toUpperCase()}</strong>
              <small>{user.email} · {user.roles?.join(", ") || "no role"} · MFA {user.mfaEnabled ? "ON" : "OFF"}</small>
              <Button isDisabled={isBusy || user.id === current?.id} onPress={() => onToggleStatus(user)} size="xs" variant="ghost">
                {user.status === "active" ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>

        <div className="settings-provider-list" aria-label="Roles">
          {roles.map((role) => (
            <div key={role.id}>
              <span>{role.name}</span>
              <strong><i /> {role.permissions.length} PERMS</strong>
              <small>{role.description}</small>
            </div>
          ))}
        </div>

        <div className="settings-provider-list" aria-label="Sessions">
          {sessions.map((session) => (
            <div key={session.id}>
              <span>{session.id}</span>
              <StatusChip tone={session.isActive ? "success" : "neutral"}>SESSION</StatusChip>
              <small>{session.userId} · expires {session.expiresAtLabel}</small>
              <Button isDisabled={isBusy} onPress={() => onRevokeSession(session.id)} size="xs" variant="ghost">Revoke</Button>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}

type SessionView = AdminSession & {
  expiresAtLabel: string;
  isActive: boolean;
};

function toSessionView(session: AdminSession): SessionView {
  const expiresAt = new Date(session.expiresAt);
  return {
    ...session,
    expiresAtLabel: expiresAt.toLocaleString(),
    isActive: expiresAt.getTime() > Date.now()
  };
}
