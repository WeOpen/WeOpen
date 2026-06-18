"use client";

import { useCallback, useState } from "react";
import { currentUser, type AuthUser } from "@/shared/api/auth";
import { formatTimestamp } from "@/shared/format";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { Alert, Card, SkeletonStack, StatusChip } from "@weopen/ui";

export function AccountProfilePanel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(() => {
    let isMounted = true;
    void currentUser()
      .then((result) => {
        if (!isMounted) return;
        setUser(result?.user ?? null);
        setError(result?.user ? "" : "No active user session was returned.");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setUser(null);
        setError(err instanceof Error ? err.message : "Account profile loading failed");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useRouteRefresh({
    pathname: "/settings",
    refresh: loadUser
  });

  return (
    <Card className="settings-profile-card">
      <Card.Header>
        <Card.Title>Account Profile</Card.Title>
        <StatusChip tone={user?.status === "active" ? "success" : error ? "danger" : "neutral"}>
          {isLoading ? "Checking" : user?.status ?? "Unavailable"}
        </StatusChip>
      </Card.Header>
      <Card.Content>
        {isLoading ? (
          <SkeletonStack rowHeight={42} rows={5} widths={["100%", "92%", "86%", "78%", "70%"]} />
        ) : error ? (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : user ? (
          <>
            <dl className="settings-profile-grid">
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Display name</dt>
                <dd>{user.displayName || "Not set"}</dd>
              </div>
              <div>
                <dt>Roles</dt>
                <dd>{joinList(user.roles)}</dd>
              </div>
              <div>
                <dt>Permissions</dt>
                <dd>{joinList(user.permissions)}</dd>
              </div>
              <div>
                <dt>MFA</dt>
                <dd>{user.mfaEnabled ? "Enabled" : "Off"}</dd>
              </div>
              <div>
                <dt>Password changed</dt>
                <dd>{formatOptionalTimestamp(user.passwordChangedAt)}</dd>
              </div>
              <div>
                <dt>Last login</dt>
                <dd>{formatOptionalTimestamp(user.lastLoginAt)}</dd>
              </div>
            </dl>
            {user.mustChangePassword ? (
              <Alert status="warning">
                <Alert.Content>
                  <Alert.Description>This account must change its temporary password before normal use.</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
          </>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function joinList(values: string[] | undefined): string {
  if (!values?.length) {
    return "None";
  }
  return values.join(" / ");
}

function formatOptionalTimestamp(value: string | undefined): string {
  if (!value) {
    return "Not recorded";
  }
  return formatTimestamp(value);
}
