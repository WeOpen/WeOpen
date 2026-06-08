"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@weopen/ui";
import { currentUser, logout, type AuthUser } from "@/shared/api/auth";

type SessionState = {
  isLoading: boolean;
  user: AuthUser | null;
};

/** SessionControl shows the active principal and provides an explicit session teardown. */
export function SessionControl() {
  const router = useRouter();
  const [{ isLoading, user }, setSession] = useState<SessionState>({ isLoading: true, user: null });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
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
  }, []);

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
    <div className="auth-session-control" aria-label="Current session">
      <div className="auth-session-principal">
        <span>{isLoading ? "CHECKING" : user ? roleLabel : "NO SESSION"}</span>
        <strong>{user?.displayName || user?.email || "UNAUTHENTICATED"}</strong>
      </div>
      <Button
        aria-label="Sign out"
        className="auth-session-logout"
        isPending={isLoggingOut}
        onPress={onLogout}
        size="sm"
        variant="secondary"
      >
        LOGOUT
      </Button>
    </div>
  );
}
