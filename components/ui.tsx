import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Mono chips. The blue container tag and amber caution tag are informational —
   never used for buttons or links (PRD §4.1, single accent rule). */

type TagKind = "yield" | "container" | "caution" | "neutral";

const TAG_STYLES: Record<TagKind, string> = {
  yield: "text-accent border-green-border bg-green-tint",
  container: "text-container-ink border-container-border bg-container-fill",
  caution: "text-caution-ink border-caution-border bg-caution-fill",
  neutral: "text-ink-muted border-line bg-surface",
};

export function Tag({ kind = "neutral", children }: { kind?: TagKind; children: ReactNode }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-[3px] border px-[6px] py-[2px] font-mono text-[10px] uppercase leading-[1.4] md:text-[11px] ${TAG_STYLES[kind]}`}
    >
      {children}
    </span>
  );
}

/* Buttons. Primary = green fill; secondary = white fill with a green label. */

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
};

const BASE =
  "inline-flex items-center justify-center rounded-[6px] px-4 py-[14px] text-[15px] font-semibold transition-colors md:rounded-[5px] md:px-[18px] md:py-[10px] md:text-[14px]";

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const look = disabled
    ? "bg-btn-disabled text-ink-disabled border border-btn-disabled cursor-not-allowed"
    : variant === "primary"
      ? "bg-accent text-white border border-accent hover:bg-accent-hover cursor-pointer"
      : "bg-surface text-accent border border-[#c8cec9] hover:border-accent cursor-pointer";
  const width = fullWidth ? "w-full" : "";
  return <button className={`${BASE} ${look} ${width} ${className}`} disabled={disabled} {...rest} />;
}

/** A button that navigates. Same styling, rendered as an anchor. */
export function ButtonLink({
  variant = "primary",
  fullWidth = false,
  className = "",
  href,
  children,
}: {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  className?: string;
  href: string;
  children: ReactNode;
}) {
  const look =
    variant === "primary"
      ? "bg-accent text-white border border-accent hover:bg-accent-hover"
      : "bg-surface text-accent border border-[#c8cec9] hover:border-accent";
  return (
    <Link href={href} className={`${BASE} ${look} ${fullWidth ? "w-full" : ""} ${className}`}>
      {children}
    </Link>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-accent underline underline-offset-2 hover:text-link-hover">
      {children}
    </Link>
  );
}

/* Form field wrapper: label, control, helper line. Helper text is always
   rendered so a resolving field never changes the height of the form. */

export function Field({
  label,
  htmlFor,
  helper,
  helperTone = "muted",
  children,
}: {
  label: string;
  htmlFor?: string;
  helper?: ReactNode;
  helperTone?: "muted" | "green" | "error" | "disabled";
  children: ReactNode;
}) {
  const tone = {
    muted: "text-ink-muted-2",
    green: "text-accent",
    error: "text-error-ink",
    disabled: "text-ink-disabled",
  }[helperTone];
  return (
    <div className="flex flex-col gap-[6px]">
      <label
        htmlFor={htmlFor}
        className={`text-[13px] font-semibold ${helperTone === "disabled" ? "text-ink-disabled" : "text-ink"}`}
      >
        {label}
      </label>
      {children}
      {helper !== undefined && <p className={`text-[12px] leading-[1.5] ${tone}`}>{helper}</p>}
    </div>
  );
}

const INPUT_BASE =
  "w-full rounded-[6px] border px-3 py-[13px] text-[16px] text-ink outline-none md:rounded-[5px] md:py-[11px] md:text-[14px]";

export function TextInput({
  invalid = false,
  edited = false,
  className = "",
  ...rest
}: ComponentProps<"input"> & { invalid?: boolean; edited?: boolean }) {
  const look = rest.disabled || rest.readOnly
    ? "border-line-light bg-disabled-fill text-ink-disabled"
    : invalid
      ? "border-error-ink bg-surface"
      : edited
        ? "border-accent bg-surface"
        : "border-line-dashed bg-surface";
  return <input className={`${INPUT_BASE} ${look} ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: ComponentProps<"select">) {
  return (
    <select
      className={`${INPUT_BASE} border-line-dashed bg-surface ${className}`}
      {...rest}
    />
  );
}

/* Panels */

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[6px] border border-line bg-subtle p-6 ${className}`}>{children}</div>
  );
}

export function DashedPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[6px] border border-dashed border-line-dashed bg-subtle-2 p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[6px] border border-green-tint-border bg-green-tint px-4 py-3 text-[13px] text-green-tint-ink">
      {children}
    </div>
  );
}

export function ErrorPanel({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-error-border bg-error-fill p-5">
      <h3 className="text-[17px] font-semibold text-error-heading">{heading}</h3>
      <div className="mt-2 text-[14px] text-ink-body-2">{children}</div>
    </div>
  );
}

export function MonoLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-normal text-ink-muted-3">{children}</p>
  );
}
