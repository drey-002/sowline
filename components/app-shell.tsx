"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePlan } from "@/lib/plan-context";
import { effectiveLastFrost, formatMonthDay, frostFreeDays, planYearFor } from "@/lib/derive";

export const STEPS = [
  { n: 1, label: "Zone", href: "/setup", mobileTitle: "Zone & frost" },
  { n: 2, label: "Crops", href: "/crops", mobileTitle: "Crops" },
  { n: 3, label: "Plan", href: "/plan", mobileTitle: "Planting plan" },
  { n: 4, label: "Companions", href: "/companions", mobileTitle: "Companions" },
  { n: 5, label: "Log", href: "/log", mobileTitle: "Garden log" },
] as const;

/**
 * Step nav has four states, not three: alongside inactive / current /
 * completed there is a green-without-check "go here next", which is how the
 * empty crops screen points back at an unset zone.
 */
function stepTone(step: number, current: number, zoneSet: boolean): string {
  if (step === current) return "text-ink font-semibold";
  if (step === 1 && !zoneSet) return "text-accent";
  if (step < current && zoneSet) return "text-accent";
  return "text-ink-muted-3";
}

export function AppShell({
  current,
  children,
  contextStrip,
}: {
  current: number;
  children: ReactNode;
  contextStrip?: ReactNode;
}) {
  const { plan } = usePlan();
  const zoneSet = Boolean(plan?.location.hardinessZone);
  const step = STEPS.find((s) => s.n === current)!;
  // Before a zone is set there is no zone-specific frost date, so the header
  // falls back to a generic US average to pick the season it is planning for.
  const year = plan?.year ?? planYearFor("04-22");

  return (
    <div className="mx-auto w-full max-w-[1180px] md:px-6 md:py-8">
      <div className="overflow-hidden border-border-strong bg-surface md:rounded-[6px] md:border">
        {/* Desktop header */}
        <header className="hidden items-center justify-between border-b border-line-light px-6 py-4 md:flex">
          {/* The desktop design puts the descriptive heading in the content
              area, so the page's h1 is carried here for assistive tech only.
              Exactly one h1 is exposed at any width — the mobile header below
              renders the visible one, and only one header is ever displayed. */}
          <h1 className="sr-only">{step.mobileTitle}</h1>
          <span className="text-[16px] font-semibold text-ink">Season Plan {year}</span>
          <nav className="flex items-center gap-5 text-[13px]">
            {STEPS.map((s) => (
              <Link
                key={s.n}
                href={s.href}
                aria-current={s.n === current ? "step" : undefined}
                className={`${stepTone(s.n, current, zoneSet)} hover:text-ink`}
              >
                {s.n} · {s.label}
                {s.n < current && zoneSet ? " ✓" : ""}
              </Link>
            ))}
          </nav>
        </header>

        {/* Mobile header collapses to a two-line block, with the step nav kept
            as a scrollable row beneath it — without it the phone layout has no
            way back to a finished step, only Continue. */}
        <header className="border-b border-line-light md:hidden">
          <div className="px-4 pt-3">
            <p className="font-mono text-[11px] uppercase text-ink-muted-3">
              Step {current} of 5
            </p>
            <h1 className="text-[17px] font-semibold text-ink">{step.mobileTitle}</h1>
          </div>
          <nav
            aria-label="Planning steps"
            className="mt-2 flex gap-4 overflow-x-auto px-4 pb-[10px] text-[12px]"
          >
            {STEPS.map((s) => (
              <Link
                key={s.n}
                href={s.href}
                aria-current={s.n === current ? "step" : undefined}
                className={`shrink-0 whitespace-nowrap ${stepTone(s.n, current, zoneSet)}`}
              >
                {s.n} · {s.label}
                {s.n < current && zoneSet ? " ✓" : ""}
              </Link>
            ))}
          </nav>
        </header>

        {contextStrip}
        {children}
      </div>
    </div>
  );
}

/**
 * Zone / frost summary below the header on screens 2–5. Three variants: unset
 * (neutral fill, "Set zone & frost date"), resolving (zip and zone known but
 * the season not yet computed), and populated.
 */
export function ContextStrip({ resolving = false }: { resolving?: boolean }) {
  const { plan } = usePlan();
  const location = plan?.location;

  if (!location?.hardinessZone) {
    return (
      <div className="flex items-center justify-between border-b border-line-light bg-neutral-strip px-4 py-3 text-[13px] text-ink-muted-2 md:px-6">
        <span className="hidden md:inline">Zone: — | Last frost: — | Frost-free days: —</span>
        <span className="md:hidden">Zone not set</span>
        <Link href="/setup" className="text-accent underline underline-offset-2 hover:text-link-hover">
          <span className="hidden md:inline">Set zone &amp; frost date</span>
          <span className="md:hidden">Set zone</span>
        </Link>
      </div>
    );
  }

  const lastFrost = formatMonthDay(effectiveLastFrost(location));
  const days = frostFreeDays(location);
  const sep = <span className="px-3 text-strip-sep">|</span>;

  return (
    <div className="flex items-center justify-between border-b border-green-tint-border bg-green-tint px-4 py-3 text-[13px] text-green-tint-ink md:px-6">
      {/* Desktop: full strip. Resolving omits the season figures, which are
          not known until the recommendations land. */}
      <span className="hidden md:flex md:items-center">
        <span>
          <strong className="font-semibold">Zone {location.hardinessZone}</strong> · {location.zipCode}
        </span>
        {sep}
        <span>
          Last frost <strong className="font-semibold">{lastFrost}</strong>
        </span>
        {!resolving && (
          <>
            {sep}
            <span>
              First frost <strong className="font-semibold">{formatMonthDay(location.firstFrostAvg)}</strong>
            </span>
            {sep}
            <span>{days} frost-free days</span>
          </>
        )}
      </span>
      {/* Mobile condenses — the full desktop string does not fit at 390px. */}
      <span className="md:hidden">
        <strong className="font-semibold">Zone {location.hardinessZone}</strong> · frost {lastFrost}
        {!resolving && ` · ${days} days`}
      </span>
      <Link href="/setup" className="text-accent underline underline-offset-2 hover:text-link-hover">
        Edit
      </Link>
    </div>
  );
}
