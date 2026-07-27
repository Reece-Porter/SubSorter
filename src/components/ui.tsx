"use client";

import React from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger" | "quiet";
type ButtonSize = "sm" | "md";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-[background-color,box-shadow,transform,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/45 focus-visible:ring-offset-1 focus-visible:ring-offset-paper active:translate-y-px disabled:opacity-50 disabled:pointer-events-none";
  const sizes: Record<ButtonSize, string> = {
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-4 py-2.5",
  };
  const variants: Record<ButtonVariant, string> = {
    // Primary is the calm, confident ink button — the default call to action.
    primary: "bg-ink text-paper hover:shadow-cardHover",
    secondary: "bg-card text-ink-800 border border-hairline hover:bg-sunken",
    ghost: "text-ink-600 hover:bg-sunken hover:text-ink-900",
    // Accent (garnet) is reserved for genuine urgency / cancel actions.
    accent: "bg-accent-500 text-white hover:bg-accent-600 shadow-card",
    danger: "bg-danger-600 text-white hover:opacity-90 shadow-card",
    quiet: "text-accent-ink hover:underline underline-offset-4",
  };
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl bg-card border border-hairline shadow-card", className)} {...props} />
  );
}

type Tone = "neutral" | "accent" | "accentSoft" | "positive" | "muted";

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
    neutral: "bg-sunken text-ink-600",
    accent: "bg-accent-500 text-white",
    accentSoft: "bg-accent-50 text-accent-ink",
    positive: "bg-positive-50 text-positive-600",
    muted: "bg-sunken text-ink-500",
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
        <p className="mt-1 text-xs text-accent-ink">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-colors";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(inputBase, className)} {...props} />;
  }
);

// A custom chevron (currentColor) so the control matches the theme in both modes.
const CHEVRON =
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%2378736a%22 stroke-width=%221.8%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 viewBox=%220 0 24 24%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.7rem_center] bg-no-repeat";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cx(inputBase, "appearance-none pr-9 cursor-pointer", CHEVRON, className)} {...props}>
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
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative w-full bg-card shadow-pop rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col border border-hairline",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-500 hover:bg-sunken hover:text-ink-900"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer ? <div className="px-5 py-4 border-t border-hairline bg-sunken/40 rounded-b-2xl">{footer}</div> : null}
      </div>
    </div>
  );
}
