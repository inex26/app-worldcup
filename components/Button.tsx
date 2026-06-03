import type { ButtonHTMLAttributes } from "react";

type Variant = "filled" | "outlined" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  size?: "md" | "sm";
  /** When true, shows an inline spinner and disables the button. */
  loading?: boolean;
}

/** Themed button with filled/outlined/ghost variants and an inline loading state. */
export function Button({
  variant = "filled",
  block = false,
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    `btn-${variant}`,
    block ? "btn-block" : "",
    size === "sm" ? "btn-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/** 16px inline spinner. */
export function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Loading"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </svg>
  );
}
