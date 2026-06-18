"use client";

import { useState } from "react";
import { changePassword } from "@/shared/api/auth";
import { Alert, Button, Card, Input, StatusChip } from "@weopen/ui";

export function PasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"danger" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsDoNotMatch = Boolean(newPasswordConfirmation) && newPassword !== newPasswordConfirmation;
  const passwordPolicyError = newPassword && !isPasswordPolicyMet(newPassword)
    ? "Use 12+ chars with uppercase, lowercase, number, and symbol"
    : undefined;
  const canSubmit = Boolean(currentPassword && newPassword && newPasswordConfirmation) && !passwordsDoNotMatch && !passwordPolicyError;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordsDoNotMatch) {
      setMessageTone("danger");
      setMessage("New password confirmation does not match.");
      return;
    }
    if (!canSubmit) {
      setMessageTone("danger");
      setMessage(passwordPolicyError ?? "Complete all password fields before updating.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setMessageTone("success");
      setMessage("Password updated. Other active sessions were revoked.");
    } catch (err) {
      setMessageTone("danger");
      setMessage(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="settings-password-card">
      <Card.Header>
        <Card.Title>Password</Card.Title>
        <StatusChip tone="warning">Policy</StatusChip>
      </Card.Header>
      <Card.Content>
        <form className="settings-form" onSubmit={onSubmit}>
          <input autoComplete="username" hidden name="username" readOnly type="text" value="weopen-admin" />
          <Input
            autoComplete="current-password"
            label="Current password"
            name="currentPassword"
            onChange={(event) => setCurrentPassword(event.target.value)}
            type="password"
            value={currentPassword}
          />
          <Input
            autoComplete="new-password"
            errorMessage={passwordPolicyError}
            isInvalid={Boolean(passwordPolicyError)}
            label="New password"
            name="newPassword"
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            value={newPassword}
          />
          <Input
            autoComplete="new-password"
            errorMessage={passwordsDoNotMatch ? "Passwords do not match" : undefined}
            isInvalid={passwordsDoNotMatch}
            label="Confirm new password"
            name="newPasswordConfirmation"
            onChange={(event) => setNewPasswordConfirmation(event.target.value)}
            type="password"
            value={newPasswordConfirmation}
          />
          <p className="settings-help-text">Use at least 12 characters with uppercase, lowercase, number, and symbol.</p>
          <Button isDisabled={!canSubmit} isPending={isSubmitting} type="submit" variant="secondary">
            Update password
          </Button>
          {message ? (
            <Alert status={messageTone}>
              <Alert.Content>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </form>
      </Card.Content>
    </Card>
  );
}

function isPasswordPolicyMet(password: string): boolean {
  return password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^\dA-Za-z]/.test(password);
}
