"use client";

import { useState } from "react";
import { Button, Input } from "@weopen/ui";
import { login } from "@/lib/auth";

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
      setMessage("登录成功，可以进入 Dashboard。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <Input
        autoComplete="email"
        label="邮箱"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        value={email}
      />
      <Input
        autoComplete="current-password"
        label="密码"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        type="password"
        value={password}
      />
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "登录中" : "登录"}
      </Button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
