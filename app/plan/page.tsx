"use client";

import { useMemo } from "react";
import { AppShell, ContextStrip } from "@/components/app-shell";
import { ButtonLink, DashedPanel, Tag } from "@/components/ui";
import { StepActions } from "@/components/step-actions";
import { CROPS_BY_ID } from "@/data/crops";
import { bySowDate, formatMonthDay, sowDateLabel, sowMethodLabel } from "@/lib/derive";
import { usePlan } from "@/lib/plan-context";
import type { Crop, Location, PlanCrop } from "@/lib/types";

const SUN_COPY: Record<Crop["sunNeeds"], string> = {
  full: "full — 6+ hrs",
  partial: "partial — 4–6 hrs",
  "shade-tolerant": "shade-tolerant — under 4 hrs",
};

export default function PlanPage() {
  const { plan, selectedCrops } = usePlan();
  const location = plan?.location ?? null;
  // The planting plan is a schedule, so it reads in the order things go in the
  // ground rather than the order they happened to be ticked.
  const ordered = useMemo(() => bySowDate(selectedCrops, CROPS_BY_ID), [selectedCrops]);

  return (
    <AppShell current={4} contextStrip={<ContextStrip />}>
      <div className="p-4 md:p-6">
        <h2 className="hidden text-[17px] font-semibold text-ink md:block">Planting plan</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <p className="text-[13px] text-ink-body md:mt-1">
            Timing, spacing and soil for each crop you selected, in sowing order.
          </p>
          {selectedCrops.length > 0 && (
            <button
              onClick={() => window.print()}
              className="no-print shrink-0 cursor-pointer rounded-[6px] border border-[#c8cec9] bg-surface px-4 py-[14px] text-[15px] font-semibold text-accent hover:border-accent md:rounded-[5px] md:px-[18px] md:py-[10px] md:text-[14px]"
            >
              Print plan
            </button>
          )}
        </div>

        {selectedCrops.length === 0 || !location ? (
          <DashedPanel className="mt-5">
            <h3 className="text-[18px] font-semibold text-ink">No crops selected yet</h3>
            <p className="mt-2 text-[14px] text-ink-body-2">
              Pick a few crops and their planting specs will appear here.
            </p>
            <div className="mt-5">
              <ButtonLink href="/crops">Back to Crop Recommendations</ButtonLink>
            </div>
          </DashedPanel>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-3">
              {ordered.map((pc) => (
                <PlanCard key={pc.id} planCrop={pc} location={location} />
              ))}
            </div>
            <StepActions
              className="no-print"
              backHref="/companions"
              backLabel="Back to Companions"
              continueHref="/log"
              continueLabel="Continue to My Garden Log"
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

function PlanCard({ planCrop, location }: { planCrop: PlanCrop; location: Location }) {
  const crop = planCrop.cropId ? CROPS_BY_ID.get(planCrop.cropId) : undefined;
  const name = crop ? `${crop.name}${crop.variety ? ` — '${crop.variety}'` : ""}` : planCrop.customName;

  return (
    <div className="print-card rounded-[8px] border border-line bg-surface p-4 md:rounded-[6px] md:px-[18px] md:py-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-[6px]">
        <h3 className="text-[15px] font-semibold text-ink md:text-[16px]">{name}</h3>
        {crop?.descriptorTags.map((t) => <Tag key={t}>{t}</Tag>)}
        {crop?.containerFriendly && <Tag kind="container">Good for container</Tag>}
        {crop?.cautionTag && <Tag kind="caution">{crop.cautionTag}</Tag>}
        {!crop && <Tag>Custom</Tag>}
      </div>

      {crop ? (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2 md:grid-cols-3">
          <Spec label="Sow">
            {sowMethodLabel(crop).toLowerCase()} {sowDateLabel(crop, location)}
          </Spec>
          <Spec label="Days to maturity">{crop.daysToMaturity} days</Spec>
          <Spec label="Spacing">
            {crop.spacingInches} in apart, rows {crop.rowSpacingInches} in
          </Spec>
          <Spec label="Depth">{crop.depthInches} in</Spec>
          <Spec label="Sun">{SUN_COPY[crop.sunNeeds]}</Spec>
          <Spec label="Soil mix">{crop.soilMix}</Spec>
        </dl>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2 md:grid-cols-3">
          <Spec label="Sow">
            {planCrop.customSowMethod === "transplant" ? "transplant" : "direct sow"}
            {" — "}
            {formatMonthDay(location.lastFrostAvg)} onward
          </Spec>
          <Spec label="Days to maturity">
            {planCrop.customDaysToMaturity ? `${planCrop.customDaysToMaturity} days` : "—"}
          </Spec>
          <Spec label="Spacing">Not in the catalog yet</Spec>
        </dl>
      )}
    </div>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="mt-[2px] text-ink">{children}</dd>
    </div>
  );
}
