"use client";

import React from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 disabled:pointer-events-none";
  const sizes: Record<ButtonSize, string> = {
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-4 py-2.5",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
    secondary: "bg-white text-ink-800 border border-line hover:bg-canvas-sunken",
    ghost: "text-ink-600 hover:bg-canvas-sunken hover:text-ink-800",
    danger: "bg-urgent-500 text-white hover:bg-urgent-600 shadow-sm",
    quiet: "text-brand-600 hover:text-brand-700 hover:underline underline-offset-4",
  };
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-2xl bg-canvas-card border border-line shadow-card", className)}
      {...props}
    />
  );
}

type Tone = "neutral" | "brand" | "positive" | "caution" | "urgent" | "muted";

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  const tones: Record<Tone, string> = {
    neutral: "bg-canvas-sunken text-ink-600",
    brand: "bg-brand-50 text-brand-700",
    positive: "bg-positive-50 text-positive-600",
    caution: "bg-caution-50 text-caution-600",
    urgent: "bg-urgent-50 text-urgent-600",
    muted: "bg-canvas-sunken text-ink-500",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700 mb-1.5">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-urgent-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(inputBase, className)} {...props} />;
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cx(inputBase, "appearance-none pr-9 cursor-pointer", className)} {...props}>
        {children}
      </select>
    );
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cx(inputBase, "resize-y min-h-[72px]", className)} {...props} />;
  }
);

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative w-full bg-canvas-card shadow-pop rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-500 hover:bg-canvas-sunken hover:text-ink-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer ? <div className="px-5 py-4 border-t border-line bg-canvas-sunken/50 rounded-b-2xl">{footer}</div> : null}
      </div>
    </div>
  );
}
