"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, PixelIcon } from "@weopen/ui";
import { currentUser, logout, type AuthUser } from "@/shared/api/auth";

type SessionState = {
  isLoading: boolean;
  user: AuthUser | null;
};

type SessionControlProps = {
  compact?: boolean;
};

/** SessionControl shows the active principal and provides an explicit session teardown. */
export function SessionControl({ compact = false }: SessionControlProps) {
  const router = useRouter();
  const [{ isLoading, user }, setSession] = useState<SessionState>({ isLoading: true, user: null });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (compact) {
      return;
    }

    let isMounted = true;

    void currentUser().then((result) => {
      if (!isMounted) {
        return;
      }
      setSession({ isLoading: false, user: result?.user ?? null });
    });

    return () => {
      isMounted = false;
    };
  }, [compact]);

  const roleLabel = user?.roles?.[0]?.toUpperCase() ?? "AUTH";

  async function onLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className={compact ? "auth-session-control auth-session-control-compact" : "auth-session-control"} aria-label="Current session">
      {compact ? null : (
        <div className="auth-session-principal">
          <span>{isLoading ? "CHECKING" : user ? roleLabel : "NO SESSION"}</span>
          <strong>{user?.displayName || user?.email || "UNAUTHENTICATED"}</strong>
        </div>
      )}
      <Button
        aria-label="Sign out"
        className="auth-session-logout"
        isPending={isLoggingOut}
        onPress={onLogout}
        size="sm"
        variant="secondary"
      >
        <PixelIcon name="logout" variant="bare" />
        <span>LOGOUT</span>
      </Button>
    </div>
  );
}
