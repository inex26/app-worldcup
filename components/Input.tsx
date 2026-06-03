import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
}

/** Labelled text input with helper text and an accessible error state. */
export function Input({ label, helper, error, id, className = "", ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, helper ? helperId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        className={["input", error ? "input-invalid" : "", className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      {helper && !error && (
        <span id={helperId} className="helper">
          {helper}
        </span>
      )}
      {error && (
        <span id={errorId} className="inline-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
