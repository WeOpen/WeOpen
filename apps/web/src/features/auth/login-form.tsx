"use client";

import { useState } from "react";
import { login } from "@/shared/api/auth";
import { Alert, Button, Input } from "@weopen/ui";

export function LoginForm() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      await login({ email, password });
      setMessage("Signed in. You can enter the command center.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <Input
        autoComplete="email"
        label="Email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        value={email}
      />
      <Input
        autoComplete="current-password"
        label="Password"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password"
        type="password"
        value={password}
      />
      <Button fullWidth isPending={isSubmitting} type="submit" variant="secondary">
        {isSubmitting ? "Signing In" : "Sign In"}
      </Button>
      {message ? (
        <Alert status={message.includes("Signed") ? "success" : "danger"}>
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </form>
  );
}
