"use client";

import type { Crop, PlanCrop } from "@/lib/types";
import { timingLine } from "@/lib/derive";
import type { Location } from "@/lib/types";
import { Tag } from "./ui";

/**
 * Tag order follows the approved screenshots: rank badge, then the neutral
 * descriptor, then the blue container chip, then the amber caution.
 */
function CropTags({ crop, isTopRanked }: { crop: Crop; isTopRanked: boolean }) {
  return (
    <>
      {isTopRanked && <Tag kind="yield">Highest yield / sq ft</Tag>}
      {crop.descriptorTags.map((t) => (
        <Tag key={t}>{t}</Tag>
      ))}
      {crop.containerFriendly && <Tag kind="container">Good for container</Tag>}
      {crop.cautionTag && <Tag kind="caution">{crop.cautionTag}</Tag>}
    </>
  );
}

export function CropCard({
  crop,
  planCrop,
  location,
  isTopRanked,
  showWhy,
  onToggle,
  onQuantity,
}: {
  crop: Crop | null;
  planCrop: PlanCrop;
  location: Location | null;
  isTopRanked: boolean;
  showWhy: boolean;
  onToggle: () => void;
  onQuantity: (value: number | null) => void;
}) {
  const selected = planCrop.selected;
  const name = crop ? crop.name : (planCrop.customName ?? "Custom crop");
  const variety = crop?.variety;
  const unitLabel = crop?.quantityUnit === "plants" ? "Plants" : "Row feet";

  const shell = selected
    ? "border-green-border bg-selected-fill"
    : "border-line bg-surface";

  return (
    <div className={`rounded-[8px] border p-4 md:rounded-[6px] md:px-[18px] md:py-4 ${shell}`}>
      {/*
        One grid, two shapes. At 390px the quantity cell wraps to its own row
        spanning both columns, divided from the text above; at desktop width it
        becomes the third column. Rendering it once keeps a single labelled
        control in the accessibility tree at every width.
      */}
      <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3 md:grid-cols-[24px_minmax(0,1fr)_150px] md:gap-[14px]">
        <div className="flex min-h-[44px] items-start pt-[2px] md:min-h-0 md:pt-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${name}`}
            className="h-5 w-5 cursor-pointer md:h-[17px] md:w-[17px]"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-[6px]">
            <h3 className="text-[15px] font-semibold text-ink md:text-[16px]">
              {name}
              {variety ? ` — '${variety}'` : ""}
            </h3>
            {crop ? (
              <CropTags crop={crop} isTopRanked={isTopRanked} />
            ) : (
              <Tag>Custom</Tag>
            )}
          </div>

          {crop && location && (
            <p className="mt-[6px] text-[12px] text-ink-body md:text-[13px]">
              {timingLine(crop, location)}
            </p>
          )}
          {!crop && planCrop.customDaysToMaturity && (
            <p className="mt-[6px] text-[12px] text-ink-body md:text-[13px]">
              {planCrop.customSowMethod === "transplant" ? "Transplant" : "Direct sow"} ·{" "}
              {planCrop.customDaysToMaturity} days
            </p>
          )}

          {showWhy && crop && (
            <p className="mt-[6px] text-[12px] text-ink-muted md:text-[13px]">
              Why: {crop.whyStrategic}
            </p>
          )}
        </div>

        <div className="col-span-2 mt-3 flex items-center justify-between border-t border-green-divider pt-3 md:col-span-1 md:mt-0 md:flex-col md:items-stretch md:gap-[6px] md:border-t-0 md:pt-0">
          <span className={`text-[13px] ${selected ? "text-ink-muted" : "text-ink-disabled"}`}>
            {unitLabel}
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label={`${unitLabel} for ${name}`}
            value={planCrop.quantity ?? ""}
            placeholder={selected ? "" : "—"}
            disabled={!selected}
            onChange={(e) => onQuantity(e.target.value === "" ? null : Number(e.target.value))}
            className={`w-[96px] rounded-[5px] border px-3 py-[9px] text-[16px] outline-none md:w-full md:text-[14px] ${
              selected
                ? "border-line-dashed bg-surface text-ink"
                : "border-line bg-[#fafaf7] text-ink-disabled"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

/** Static skeleton sized to a real card so nothing jumps when data lands. */
export function SkeletonCard() {
  return (
    <div className="h-[92px] rounded-[8px] border border-line-lighter bg-skeleton p-4 md:rounded-[6px] md:px-[18px]">
      <div className="h-[10px] w-[38%] rounded-[2px] bg-skeleton-bar" />
      <div className="mt-[14px] h-[8px] w-[72%] rounded-[2px] bg-skeleton-bar-2" />
      <div className="mt-[10px] h-[8px] w-[54%] rounded-[2px] bg-skeleton-bar-2" />
    </div>
  );
}
