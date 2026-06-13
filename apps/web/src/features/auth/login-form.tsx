"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/shared/api/auth";
import { ApiError } from "@/shared/api/base";
import { queueAppToast } from "@/shared/layout/app-toast-bridge";
import { Alert, Button, Input } from "@weopen/ui";

export function LoginForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      await login({ email, password, totpCode: requiresMFA ? totpCode : undefined });
      queueAppToast({
        description: "Entering the command center.",
        title: "Signed in",
        tone: "success"
      });
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "AUTH_MFA_REQUIRED") {
        setRequiresMFA(true);
      }
      setMessage(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <Input
        autoComplete="email"
        autoFocus
        label="Email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
        type="email"
        value={email}
      />
      <Input
        autoComplete="current-password"
        label="Password"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password"
        required
        type="password"
        value={password}
      />
      {requiresMFA ? (
        <Input
          autoComplete="one-time-code"
          inputMode="numeric"
          label="Authenticator code"
          maxLength={6}
          name="totpCode"
          onChange={(event) => setTotpCode(event.target.value)}
          pattern="[0-9]{6}"
          placeholder="000000"
          required
          value={totpCode}
        />
      ) : null}
      <Button fullWidth isPending={isSubmitting} type="submit" variant="secondary">
        {isSubmitting ? "Signing In" : "Sign In"}
      </Button>
      {message ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </form>
  );
}
