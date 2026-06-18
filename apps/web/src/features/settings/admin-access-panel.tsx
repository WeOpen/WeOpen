"use client";

import { useCallback, useMemo, useState } from "react";
import { createUser, listRoles, listSessions, listUsers, revokeSession, updateUser, type AdminRole, type AdminSession } from "@/shared/api/admin";
import { currentUser, hasPermission, type AuthUser } from "@/shared/api/auth";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { Alert, Button, Card, Input, SelectField, SkeletonStack, StatusChip } from "@weopen/ui";

export function AdminAccessPanel() {
  const [current, setCurrent] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [message, setMessage] = useState("");
  const [isCheckingCurrent, setIsCheckingCurrent] = useState(true);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    roles: ["admin"]
  });

  const canManageUsers = hasPermission(current, "user:manage");
  const roleNames = useMemo(() => roles.map((role) => role.name), [roles]);
  const roleOptions = useMemo(() => roles.map((role) => ({
    description: role.description,
    label: role.name,
    value: role.name
  })), [roles]);

  const loadCurrentUser = useCallback(() => {
    let isMounted = true;
    void currentUser()
      .then((result) => {
        if (!isMounted) return;
        setCurrent(result?.user ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setCurrent(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingCurrent(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useRouteRefresh({
    pathname: "/settings",
    refresh: loadCurrentUser
  });

  const refresh = useCallback(async (clearMessage = true) => {
    if (clearMessage) {
      setMessage("");
    }
    const [nextUsers, nextRoles, nextSessions] = await Promise.all([listUsers(), listRoles(), listSessions()]);
    setUsers(nextUsers);
    setRoles(nextRoles);
    setSessions(nextSessions.map(toSessionView));
  }, []);

  const loadDirectory = useCallback(() => {
    let isMounted = true;
    void (async () => {
      await Promise.resolve();
      if (!isMounted) return;
      setIsLoadingDirectory(true);
      try {
        const [nextUsers, nextRoles, nextSessions] = await Promise.all([listUsers(), listRoles(), listSessions()]);
        if (!isMounted) return;
        setUsers(nextUsers);
        setRoles(nextRoles);
        setSessions(nextSessions.map(toSessionView));
      } catch (err: unknown) {
        if (!isMounted) return;
        setMessage(err instanceof Error ? err.message : "Access control loading failed");
      } finally {
        if (isMounted) {
          setIsLoadingDirectory(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useRouteRefresh({
    enabled: canManageUsers,
    pathname: "/settings",
    refresh: loadDirectory
  });

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
        roles: form.roles
      });
      setForm({ displayName: "", email: "", password: "", roles: [roleNames[0] ?? "admin"] });
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

  if (isCheckingCurrent) {
    return <AccessControlLoadingState />;
  }

  if (!canManageUsers) {
    return (
      <Card className="settings-session-card">
        <Card.Header>
          <Card.Title>Access Control</Card.Title>
          <StatusChip tone="neutral">Read only</StatusChip>
        </Card.Header>
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
      <Card.Header>
        <Card.Title>Access Control</Card.Title>
        <StatusChip tone={isLoadingDirectory ? "neutral" : "success"}>
          {isLoadingDirectory ? "Loading" : `${users.length} users`}
        </StatusChip>
      </Card.Header>
      <Card.Content>
        <form className="settings-form" onSubmit={onCreate}>
          <Input autoComplete="email" label="New user email" name="email" onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required type="email" value={form.email} />
          <Input autoComplete="name" label="Display name" name="displayName" onChange={(event) => setForm((value) => ({ ...value, displayName: event.target.value }))} value={form.displayName} />
          <Input autoComplete="new-password" label="Temporary password" name="password" onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required type="password" value={form.password} />
          <SelectField
            label="Roles"
            name="roles"
            onChange={(roles) => setForm((value) => ({ ...value, roles }))}
            options={roleOptions}
            placeholder={isLoadingDirectory ? "Loading roles" : "Select roles"}
            selectionMode="multiple"
            value={form.roles}
          />
          <Button isDisabled={!form.roles.length} isPending={isBusy} type="submit" variant="secondary">Create user</Button>
        </form>

        {message ? (
          <Alert status={message.includes("failed") || message.includes("失败") ? "danger" : "success"}>
            <Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content>
          </Alert>
        ) : null}

        <div className="settings-provider-list" aria-label="Users">
          {isLoadingDirectory ? (
            <SkeletonStack rowHeight={44} rows={3} widths={["100%", "94%", "86%"]} />
          ) : users.length ? users.map((user) => (
            <div key={user.id}>
              <span>{user.displayName || user.email}</span>
              <strong><i /> {user.status.toUpperCase()}</strong>
              <small>{user.email} · {user.roles?.join(", ") || "no role"} · MFA {user.mfaEnabled ? "ON" : "OFF"}</small>
              <Button isDisabled={isBusy || user.id === current?.id} onPress={() => onToggleStatus(user)} size="xs" variant="ghost">
                {user.status === "active" ? "Disable" : "Enable"}
              </Button>
            </div>
          )) : (
            <div>
              <span>No users</span>
              <strong><i /> EMPTY</strong>
              <small>Create the first managed user with the form above.</small>
            </div>
          )}
        </div>

        <div className="settings-provider-list" aria-label="Roles">
          {isLoadingDirectory ? (
            <SkeletonStack rowHeight={44} rows={2} widths={["94%", "82%"]} />
          ) : roles.length ? roles.map((role) => (
            <div key={role.id}>
              <span>{role.name}</span>
              <strong><i /> {role.permissions.length} PERMS</strong>
              <small>{role.description}</small>
            </div>
          )) : (
            <div>
              <span>No roles</span>
              <strong><i /> EMPTY</strong>
              <small>Role definitions have not been returned by the API.</small>
            </div>
          )}
        </div>

        <div className="settings-provider-list settings-session-list" aria-label="Sessions">
          {isLoadingDirectory ? (
            <SkeletonStack rowHeight={44} rows={3} widths={["100%", "90%", "80%"]} />
          ) : sessions.length ? sessions.map((session) => (
            <div key={session.id}>
              <span title={session.id}>{formatSessionId(session.id)}</span>
              <StatusChip tone={session.isActive ? "success" : "neutral"}>SESSION</StatusChip>
              <small>{session.userId} · expires {session.expiresAtLabel}</small>
              <Button isDisabled={isBusy} onPress={() => onRevokeSession(session.id)} size="xs" variant="ghost">Revoke</Button>
            </div>
          )) : (
            <div>
              <span>No sessions</span>
              <strong><i /> EMPTY</strong>
              <small>No active API sessions were returned for managed users.</small>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

function AccessControlLoadingState() {
  return (
    <Card aria-busy="true" className="settings-session-card">
      <Card.Header><Card.Title>Access Control</Card.Title></Card.Header>
      <Card.Content>
        <SkeletonStack rowHeight={44} rows={4} widths={["100%", "92%", "86%", "76%"]} />
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

function formatSessionId(sessionId: string): string {
  if (sessionId.length <= 20) {
    return sessionId;
  }
  return `${sessionId.slice(0, 12)}...${sessionId.slice(-4)}`;
}
