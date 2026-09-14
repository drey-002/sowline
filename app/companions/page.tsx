"use client";

import { AppShell, ContextStrip } from "@/components/app-shell";
import { ButtonLink, DashedPanel } from "@/components/ui";
import { CROPS_BY_ID } from "@/data/crops";
import { otherCropId, pairsForCrop } from "@/data/companions";
import { usePlan } from "@/lib/plan-context";
import type { CompanionPair, PlanCrop } from "@/lib/types";

export default function CompanionsPage() {
  const { plan, selectedCrops, addCatalogCrop } = usePlan();

  const selectedCropIds = new Set(
    selectedCrops.map((c) => c.cropId).filter((id): id is string => Boolean(id)),
  );

  return (
    <AppShell current={4} contextStrip={<ContextStrip />}>
      <div className="p-4 md:p-6">
        <h2 className="hidden text-[17px] font-semibold text-ink md:block">Companion planting</h2>
        <p className="text-[13px] text-ink-body md:mt-1">
          Pairings among the crops you actually picked — plus a few worth adding.
        </p>

        {!plan || selectedCrops.length === 0 ? (
          <DashedPanel className="mt-5">
            <h3 className="text-[18px] font-semibold text-ink">No crops selected yet</h3>
            <p className="mt-2 text-[14px] text-ink-body-2">
              Companion pairings only make sense once there are crops to pair.
            </p>
            <div className="mt-5">
              <ButtonLink href="/crops">Back to Crop Recommendations</ButtonLink>
            </div>
          </DashedPanel>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-3">
              {selectedCrops
                .filter((pc) => pc.cropId)
                .map((pc) => (
                  <CompanionCard
                    key={pc.id}
                    planCrop={pc}
                    selectedCropIds={selectedCropIds}
                    onAdd={addCatalogCrop}
                  />
                ))}
            </div>
            <div className="mt-6">
              <ButtonLink href="/log" className="w-full md:w-auto">
                Continue to My Garden Log
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function CompanionCard({
  planCrop,
  selectedCropIds,
  onAdd,
}: {
  planCrop: PlanCrop;
  selectedCropIds: Set<string>;
  onAdd: (cropId: string) => void;
}) {
  const cropId = planCrop.cropId!;
  const crop = CROPS_BY_ID.get(cropId);
  if (!crop) return null;

  const pairs = pairsForCrop(cropId);
  const inPlan = (p: CompanionPair) => selectedCropIds.has(otherCropId(p, cropId));

  const plantWith = pairs.filter((p) => p.relationship === "companion" && inPlan(p));
  const keepApart = pairs.filter((p) => p.relationship === "antagonist" && inPlan(p));
  const worthAdding = pairs.filter((p) => p.relationship === "companion" && !inPlan(p));

  return (
    <div className="rounded-[8px] border border-line bg-surface p-4 md:rounded-[6px] md:px-[18px] md:py-4">
      <h3 className="text-[15px] font-semibold text-ink md:text-[16px]">
        {crop.name}
        {crop.variety ? ` — '${crop.variety}'` : ""}
      </h3>

      <div className="mt-3 flex flex-col gap-4">
        <Section title="Plant with" empty="Nothing else in your plan pairs with this one.">
          {plantWith.map((p) => (
            <Row key={p.id} name={nameOf(otherCropId(p, cropId))} reason={p.reason} />
          ))}
        </Section>

        {keepApart.length > 0 && (
          <Section title="Keep apart from">
            {keepApart.map((p) => (
              <Row
                key={p.id}
                name={nameOf(otherCropId(p, cropId))}
                reason={p.reason}
                tone="warn"
              />
            ))}
          </Section>
        )}

        {worthAdding.length > 0 && (
          <Section title="Worth adding">
            {worthAdding.map((p) => {
              const otherId = otherCropId(p, cropId);
              return (
                <Row
                  key={p.id}
                  name={nameOf(otherId)}
                  reason={p.reason}
                  tone="muted"
                  action={
                    <button
                      onClick={() => onAdd(otherId)}
                      className="cursor-pointer text-[13px] text-accent underline underline-offset-2 hover:text-link-hover"
                    >
                      Add to plan
                    </button>
                  }
                />
              );
            })}
          </Section>
        )}
      </div>
    </div>
  );
}

function nameOf(cropId: string): string {
  return CROPS_BY_ID.get(cropId)?.name ?? cropId;
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string;
  children: React.ReactNode[];
}) {
  const hasRows = children.length > 0;
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
      {hasRows ? (
        <ul className="mt-1">{children}</ul>
      ) : (
        empty && <p className="mt-1 text-[13px] text-ink-muted-2">{empty}</p>
      )}
    </div>
  );
}

function Row({
  name,
  reason,
  tone = "normal",
  action,
}: {
  name: string;
  reason: string;
  tone?: "normal" | "warn" | "muted";
  action?: React.ReactNode;
}) {
  const nameTone =
    tone === "warn" ? "text-error-ink" : tone === "muted" ? "text-ink-muted-2" : "text-ink";
  return (
    <li className="flex flex-col gap-1 border-b border-line-lighter py-[10px] text-[13px] last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-ink-body">
        <strong className={`font-semibold ${nameTone}`}>{name}</strong> — {reason}
      </span>
      {action && <span className="shrink-0 whitespace-nowrap">{action}</span>}
    </li>
  );
}
