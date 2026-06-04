"use client";

import { Input } from "./Input";
import { isValidEmail, isValidPassword, isValidUsername, USERNAME_MAX } from "@/lib/auth";

/** The account fields collected when creating or joining a league. */
export interface Credentials {
  username: string;
  email: string;
  password: string;
}

export const EMPTY_CREDENTIALS: Credentials = { username: "", email: "", password: "" };

/** True when all three fields pass their shape checks. */
export function credentialsValid(c: Credentials): boolean {
  return isValidUsername(c.username) && isValidEmail(c.email) && isValidPassword(c.password);
}

/**
 * Username + email + password block, shared by the create and join flows. Username
 * is the display name shown on leaderboards; email + password is the login.
 * State is owned by the parent (so it can submit) — this is a controlled component.
 */
export function CredentialFields({
  value,
  onChange,
  disabled,
  error,
}: {
  value: Credentials;
  onChange: (next: Credentials) => void;
  disabled?: boolean;
  /** Shown on the password field (where auth errors surface). */
  error?: string;
}) {
  return (
    <>
      <Input
        label="Username"
        placeholder="e.g. Sam"
        autoComplete="nickname"
        maxLength={USERNAME_MAX}
        value={value.username}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, username: e.target.value })}
      />
      <Input
        label="Email"
        type="email"
        inputMode="email"
        placeholder="you@example.com"
        autoComplete="email"
        autoCapitalize="off"
        spellCheck={false}
        value={value.email}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, email: e.target.value })}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={value.password}
        disabled={disabled}
        error={error}
        onChange={(e) => onChange({ ...value, password: e.target.value })}
      />
    </>
  );
}
