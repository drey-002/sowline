"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CROPS, CROPS_BY_ID } from "@/data/crops";
import { AppShell, ContextStrip } from "@/components/app-shell";
import { CropCard, SkeletonCard } from "@/components/crop-card";
import {
  Button,
  ButtonLink,
  DashedPanel,
  ErrorPanel,
  MonoLabel,
  Select,
  TextInput,
} from "@/components/ui";
import { frostFreeDays, recommendCrops } from "@/lib/derive";
import { fetchRecommendations } from "@/lib/lookup";
import { usePlan } from "@/lib/plan-context";
import type { PlanCrop, SortKey, SowMethod } from "@/lib/types";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "yield", label: "Yield per sq ft" },
  { value: "earliest", label: "Earliest sow date" },
  { value: "maintenance", label: "Least maintenance" },
];

type Phase = "idle" | "loading" | "ready" | "failed";

export default function CropsScreen() {
  const {
    plan,
    state,
    hydrated,
    pendingRecommendations,
    setPendingRecommendations,
    setPrefs,
    toggleCrop,
    setQuantity,
    removeCrop,
    addCustomCrop,
    generatingWhy,
    toggleCropFor,
    setQuantityFor,
  } = usePlan();
  const { showWhy, sortBy } = state.prefs;

  const location = plan?.location ?? null;
  const zone = location?.hardinessZone ?? null;

  // Ready is the resting state, derived synchronously — a reload must not
  // flash skeletons at someone who already has an answer. Only the transient
  // loading and failed phases live in state.
  const [phase, setPhase] = useState<Exclude<Phase, "idle" | "ready">| null>(null);

  // Ranked by yield regardless of the chosen sort: the top-ranked badge and
  // the five-crop cut are both properties of yield, not of display order.
  const recommended = useMemo(() => {
    if (!location || !zone) return [];
    return recommendCrops(CROPS, zone, frostFreeDays(location), "yield");
  }, [location, zone]);

  const runLoad = useCallback(async () => {
    setPhase("loading");
    try {
      await fetchRecommendations(() => null);
      setPhase(null);
    } catch {
      setPhase("failed");
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !zone || !pendingRecommendations) return;
    // Async so nothing is set synchronously inside the effect body.
    void (async () => {
      setPendingRecommendations(false);
      await runLoad();
    })();
  }, [hydrated, zone, pendingRecommendations, setPendingRecommendations, runLoad]);

  const ordered = useMemo(() => {
    if (sortBy === "yield") return recommended;
    const copy = [...recommended];
    if (sortBy === "earliest") return copy.sort((a, b) => a.sowOffsetDays - b.sowOffsetDays);
    return copy.sort((a, b) => {
      const an = a.successionIntervalDays === null ? 0 : 1;
      const bn = b.successionIntervalDays === null ? 0 : 1;
      return an - bn || b.yieldPerSqFt - a.yieldPerSqFt;
    });
  }, [recommended, sortBy]);

  // The badge marks the highest-yield crop, not the first slot: §3 defines the
  // ranking as yield and the sort options as re-ordering that same five.
  const topRankedId = recommended[0]?.id ?? null;

  const rows = useMemo(() => {
    if (!plan) return [];
    const byCropId = new Map(plan.crops.filter((c) => c.cropId).map((c) => [c.cropId!, c]));
    const recommendedRows = ordered.map((crop) => ({
      crop,
      planCrop:
        byCropId.get(crop.id) ??
        ({
          id: `virtual-${crop.id}`,
          cropId: crop.id,
          isCustom: false,
          customName: null,
          customDaysToMaturity: null,
          customSowMethod: null,
          customWhy: null,
          quantity: null,
          selected: false,
          addedAt: "",
        } satisfies PlanCrop),
    }));
    // A crop can stay selected while dropping out of the recommended five —
    // shortening the season with a frost override is enough to do it. Keep it
    // on screen so it can be seen and unticked, not just counted in the rail.
    const recommendedIds = new Set(ordered.map((c) => c.id));
    const orphanRows = plan.crops
      .filter((c) => c.selected && c.cropId && !recommendedIds.has(c.cropId))
      .map((planCrop) => ({
        crop: CROPS_BY_ID.get(planCrop.cropId!) ?? null,
        planCrop,
      }));
    const customRows = plan.crops
      .filter((c) => c.isCustom)
      .map((planCrop) => ({ crop: null, planCrop }));
    return [...recommendedRows, ...orphanRows, ...customRows];
  }, [plan, ordered]);

  const selected = plan?.crops.filter((c) => c.selected) ?? [];
  const hasZone = zone !== null;

  return (
    <AppShell current={2} contextStrip={<ContextStrip resolving={phase === "loading"} />}>
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border-line-light p-4 md:border-r md:p-6">
          {zone === null ? (
            <EmptyState onAddCustom={addCustomCrop} />
          ) : phase === "failed" ? (
            <ErrorPanel heading="We couldn't load recommendations">
              <p>
                Your zone ({zone}) and frost date are saved. Nothing else is lost.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => void runLoad()}>Try again</Button>
              </div>
            </ErrorPanel>
          ) : phase === "loading" ? (
            <LoadingState zone={zone} />
          ) : (
            <>
              <div className="md:flex md:items-start md:justify-between md:gap-6">
                <div>
                  <h2 className="text-[17px] font-semibold text-ink">
                    Recommended for a higher-yield {zone} season
                  </h2>
                  <p className="mt-1 text-[13px] text-ink-body">
                    {ordered.length} crops, ranked by usable yield per square foot within your frost
                    window.
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:gap-4">
                  <label className="flex min-h-[44px] shrink-0 cursor-pointer items-center gap-[10px] whitespace-nowrap text-[14px] text-ink md:min-h-0">
                    <input
                      type="checkbox"
                      checked={showWhy}
                      onChange={(e) => setPrefs({ showWhy: e.target.checked })}
                      className="h-5 w-5 md:h-[17px] md:w-[17px]"
                    />
                    Show why each crop
                  </label>
                  <SortControl value={sortBy} onChange={(v) => setPrefs({ sortBy: v })} />
                </div>
              </div>

              {ordered.length === 0 ? (
                <DashedPanel className="mt-5">
                  <h3 className="text-[18px] font-semibold text-ink">
                    No catalog crops fit this season
                  </h3>
                  <p className="mt-2 text-[14px] text-ink-body-2">
                    Zone {zone} has a {location ? frostFreeDays(location) : 0}-day frost-free
                    window, which is shorter than anything in the built-in catalog. Add your own
                    crops below.
                  </p>
                </DashedPanel>
              ) : (
                <div className="mt-5 flex flex-col gap-[10px]">
                  {rows.map(({ crop, planCrop }) => (
                    <CropCard
                      key={planCrop.id}
                      crop={crop}
                      planCrop={planCrop}
                      location={location}
                      isTopRanked={crop?.id === topRankedId}
                      showWhy={showWhy}
                      generatingWhy={generatingWhy.has(planCrop.id)}
                      onToggle={() =>
                        crop ? toggleCropFor(crop.id) : toggleCrop(planCrop.id)
                      }
                      onQuantity={(v) =>
                        crop ? setQuantityFor(crop.id, v) : setQuantity(planCrop.id, v)
                      }
                    />
                  ))}
                </div>
              )}

              <AddCustomCrop onAdd={addCustomCrop} />
            </>
          )}
        </div>

        <SelectedRail selected={selected} disabled={!hasZone} onRemove={removeCrop} />
      </div>
    </AppShell>
  );
}

/**
 * Desktop pairs an external "Sort by" label with plain option text. At 390px
 * the label is dropped for width, so the options carry the prefix instead.
 */
function SortControl({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const select = (mobile: boolean) => (
    <Select
      aria-label="Sort by"
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className="md:min-w-[180px]"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {mobile ? `Sort: ${o.label.toLowerCase()}` : o.label}
        </option>
      ))}
    </Select>
  );

  return (
    <>
      <div className="md:hidden">{select(true)}</div>
      <div className="hidden flex-col gap-[6px] md:flex">
        <span className="text-[13px] text-ink-muted">Sort by</span>
        {select(false)}
      </div>
    </>
  );
}

function EmptyState({
  onAddCustom,
}: {
  onAddCustom: (input: { name: string; daysToMaturity: number | null; sowMethod: SowMethod }) => void;
}) {
  return (
    <>
      <DashedPanel>
        <h2 className="text-[18px] font-semibold text-ink">No recommendations yet</h2>
        <p className="mt-2 max-w-[46ch] text-[14px] text-ink-body-2">
          Enter a zip code on the Zone &amp; Frost Setup step. We rank crops by yield per square
          foot against your frost-free window.
        </p>
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <ButtonLink href="/setup">Set zone &amp; frost date</ButtonLink>
        </div>
      </DashedPanel>
      {/* Custom crops stay available with no zone — they just skip the timing
          calculation (PRD §4.3). */}
      <AddCustomCrop onAdd={onAddCustom} />
      <div className="mt-6 hidden md:block">
        <MonoLabel>List placeholder (disabled)</MonoLabel>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="hatch h-[76px] rounded-[6px] border border-line-lighter" />
        ))}
      </div>
    </>
  );
}

function LoadingState({ zone }: { zone: string }) {
  return (
    <>
      <p className="text-[14px] text-ink-body">Finding crops for zone {zone}…</p>
      <div className="mt-4 flex flex-col gap-[10px]">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </>
  );
}

function AddCustomCrop({
  onAdd,
}: {
  onAdd: (input: { name: string; daysToMaturity: number | null; sowMethod: SowMethod }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [method, setMethod] = useState<SowMethod>("direct");

  function submit() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), daysToMaturity: days ? Number(days) : null, sowMethod: method });
    setName("");
    setDays("");
    setOpen(false);
  }

  const fields = (
    <>
      <TextInput
        placeholder="Crop name (e.g. tomatillo)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Custom crop name"
        className="md:w-[230px]"
      />
      <TextInput
        type="number"
        min={1}
        placeholder="Days to maturity"
        value={days}
        onChange={(e) => setDays(e.target.value)}
        aria-label="Days to maturity"
        className="md:w-[150px]"
      />
      <Select
        value={method}
        onChange={(e) => setMethod(e.target.value as SowMethod)}
        aria-label="Sow method"
        className="md:w-[150px]"
      >
        <option value="direct">Direct sow</option>
        <option value="transplant">Transplant</option>
      </Select>
      <Button variant="secondary" onClick={submit}>
        Add
      </Button>
    </>
  );

  return (
    <>
      <div className="mt-4 hidden items-center gap-3 rounded-[6px] border border-dashed border-line-dashed px-[18px] py-4 md:flex">
        <span className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-ink">
          Add a custom crop
        </span>
        {fields}
      </div>

      <div className="mt-4 md:hidden">
        {open ? (
          <div className="flex flex-col gap-3 rounded-[8px] border border-dashed border-line-dashed p-4">
            {fields}
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full cursor-pointer rounded-[8px] border border-dashed border-line-dashed px-4 py-[14px] text-[15px] font-semibold text-accent"
          >
            + Add a custom crop
          </button>
        )}
      </div>
    </>
  );
}

function SelectedRail({
  selected,
  disabled,
  onRemove,
}: {
  selected: PlanCrop[];
  disabled: boolean;
  onRemove: (id: string) => void;
}) {
  const bedSpace = usePlan().bedSpace;
  const count = selected.length;

  return (
    <>
      <aside className="hidden p-6 md:block">
        <h2 className="text-[17px] font-semibold text-ink">Selected crops ({count})</h2>
        {count === 0 ? (
          <p className="mt-3 text-[13px] text-ink-body">
            Nothing selected. Pick 3–6 crops for a first season plan.
          </p>
        ) : (
          <>
            <ul className="mt-3">
              {selected.map((pc) => (
                <li
                  key={pc.id}
                  className="flex items-center justify-between border-b border-line-lighter py-[10px] text-[14px]"
                >
                  <span className="text-ink">
                    {labelFor(pc)}
                    <span className="text-ink-muted"> · {quantityLabel(pc)}</span>
                  </span>
                  <button
                    onClick={() => onRemove(pc.id)}
                    className="cursor-pointer text-[13px] text-accent underline underline-offset-2 hover:text-link-hover"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[14px] text-ink-body">
              Estimated bed space:{" "}
              <strong className="font-semibold text-ink">{bedSpace} sq ft</strong>
            </p>
          </>
        )}
        <div className="mt-5">
          {disabled || count === 0 ? (
            <Button fullWidth disabled>
              Continue to Companion Planting
            </Button>
          ) : (
            <ButtonLink href="/companions" fullWidth>
              Continue to Companion Planting
            </ButtonLink>
          )}
        </div>
        <div className="mt-3">
          <ButtonLink href="/setup" variant="secondary" fullWidth>
            ← Back to Zone &amp; Frost
          </ButtonLink>
        </div>
        {count > 0 && (
          <p className="mt-3 text-[12px] text-ink-muted-3">
            You can add or drop crops later without losing your plan.
          </p>
        )}
      </aside>

      {!disabled && count > 0 && (
        <div className="sticky bottom-0 border-t border-line-light bg-subtle px-4 py-3 md:hidden">
          <div className="flex items-center justify-between text-[14px]">
            <strong className="font-semibold text-ink">{count} crops selected</strong>
            <span className="text-ink-body">{bedSpace} sq ft</span>
          </div>
          <div className="mt-3">
            <ButtonLink href="/companions" fullWidth>
              Continue to Companion Planting
            </ButtonLink>
          </div>
        </div>
      )}
    </>
  );
}

function labelFor(pc: PlanCrop): string {
  if (pc.isCustom) return pc.customName ?? "Custom crop";
  return CROPS_BY_ID.get(pc.cropId ?? "")?.name ?? "Crop";
}

function quantityLabel(pc: PlanCrop): string {
  const crop = CROPS_BY_ID.get(pc.cropId ?? "");
  const qty = pc.quantity ?? 1;
  if (!crop) return `${qty}`;
  if (crop.quantityUnit !== "plants") return `${qty} ft`;
  return `${qty} ${qty === 1 ? "plant" : "plants"}`;
}
