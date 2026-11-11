import type { ButtonHTMLAttributes } from "react";

export interface GammaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet";
  size?: "sm" | "md";
  loading?: boolean;
}

export function GammaButton({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  className = "",
  ...props
}: GammaButtonProps) {
  return (
    <button
      className={`gamma-button gamma-button-${variant} gamma-button-${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="button-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
