"use client";

import { useCallback, useState } from "react";
import { beginMFAEnrollment, currentUser, disableMFA, verifyMFAEnrollment, type AuthUser } from "@/shared/api/auth";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { Alert, Button, Card, Input, SkeletonStack, StatusChip } from "@weopen/ui";

export function MFAPanel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const loadUser = useCallback(() => {
    let isMounted = true;
    void currentUser()
      .then((result) => {
        if (isMounted) {
          setUser(result?.user ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
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

  async function onEnroll() {
    setIsBusy(true);
    setMessage("");
    try {
      const enrollment = await beginMFAEnrollment({ currentPassword: password });
      setSecret(enrollment.secret);
      setOtpauthUrl(enrollment.otpauthUrl);
      setMessage("Add this secret to your authenticator, then verify the 6-digit code.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "MFA enrollment failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function onVerify() {
    setIsBusy(true);
    setMessage("");
    try {
      await verifyMFAEnrollment({ code });
      const refreshed = await currentUser();
      setUser(refreshed?.user ?? null);
      setSecret("");
      setOtpauthUrl("");
      setMessage("MFA enabled.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "MFA verification failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function onDisable() {
    setIsBusy(true);
    setMessage("");
    try {
      await disableMFA({ currentPassword: password });
      const refreshed = await currentUser();
      setUser(refreshed?.user ?? null);
      setSecret("");
      setOtpauthUrl("");
      setMessage("MFA disabled.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "MFA disable failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>MFA / TOTP</Card.Title>
        <StatusChip tone={user?.mfaEnabled ? "success" : "neutral"}>{isLoading ? "Checking" : user?.mfaEnabled ? "Enabled" : "Off"}</StatusChip>
      </Card.Header>
      <Card.Content>
        {isLoading ? (
          <SkeletonStack rowHeight={44} rows={3} widths={["100%", "88%", "72%"]} />
        ) : (
          <form className="settings-provider-list" onSubmit={(event) => event.preventDefault()}>
            <input autoComplete="username" hidden name="username" readOnly type="text" value="weopen-admin" />
            <div>
              <span>Authenticator</span>
              <strong><i /> {user?.mfaEnabled ? "REQUIRED AT LOGIN" : "OPTIONAL"}</strong>
              <small>TOTP uses a local secret and standard 30-second one-time codes.</small>
            </div>
            <Input autoComplete="current-password" label="Current password" name="mfaPassword" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            {secret ? (
              <>
                <Input label="TOTP secret" name="totpSecret" readOnly value={secret} />
                <Input label="otpauth URL" name="otpauthUrl" readOnly value={otpauthUrl} />
                <Input autoComplete="one-time-code" inputMode="numeric" label="6-digit code" maxLength={6} name="totpVerifyCode" onChange={(event) => setCode(event.target.value)} pattern="[0-9]{6}" value={code} />
                <Button isPending={isBusy} onPress={onVerify} variant="secondary">Verify and enable</Button>
              </>
            ) : (
              <Button isDisabled={!password} isPending={isBusy} onPress={user?.mfaEnabled ? onDisable : onEnroll} variant="secondary">
                {user?.mfaEnabled ? "Disable MFA" : "Start MFA setup"}
              </Button>
            )}
            {message ? (
              <Alert status={message.includes("failed") || message.includes("失败") ? "danger" : "success"}>
                <Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content>
              </Alert>
            ) : null}
          </form>
        )}
      </Card.Content>
    </Card>
  );
}
