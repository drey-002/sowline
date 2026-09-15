"use client";

// The one React context the PRD allows. Everything a screen needs to read or
// change about the season plan goes through here; persistence is delegated to
// lib/store.ts so swapping localStorage for an API touches one file.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CROPS_BY_ID } from "@/data/crops";
import { bedSpaceSqFt } from "./derive";
import { emptyState, loadState, newId, saveState } from "./store";
import { planYearFor } from "./derive";
import type {
  AppState,
  Location,
  LogEntry,
  PlanCrop,
  Prefs,
  SeasonPlan,
  SortKey,
} from "./types";

interface PlanContextValue {
  state: AppState;
  /** False until localStorage has been read, so SSR and first paint agree. */
  hydrated: boolean;
  plan: SeasonPlan | null;
  selectedCrops: PlanCrop[];
  bedSpace: number;
  pendingRecommendations: boolean;
  setPendingRecommendations: (value: boolean) => void;
  setPlan: (plan: SeasonPlan | null) => void;
  /** Create or update the plan from a resolved location, keeping selections. */
  applyLocation: (location: Location) => void;
  setFrostOverride: (iso: string | null) => void;
  /** Toggle a catalog crop, adding its plan row the first time it is picked. */
  toggleCropFor: (cropId: string) => void;
  setQuantityFor: (cropId: string, quantity: number | null) => void;
  toggleCrop: (planCropId: string) => void;
  setQuantity: (planCropId: string, quantity: number | null) => void;
  removeCrop: (planCropId: string) => void;
  /** Untick every crop, keeping the rows so nothing hand-typed is destroyed. */
  clearSelections: () => void;
  addCustomCrop: (input: { name: string; daysToMaturity: number | null; sowMethod: PlanCrop["customSowMethod"] }) => void;
  /** Plan crops with a why-line generation in flight. */
  generatingWhy: ReadonlySet<string>;
  addCatalogCrop: (cropId: string) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  addLogEntry: (entry: Omit<LogEntry, "id" | "createdAt">) => void;
  updateLogEntry: (id: string, patch: Partial<LogEntry>) => void;
  deleteLogEntry: (id: string) => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

/** Nothing to subscribe to — this only distinguishes server from client render. */
const noopSubscribe = () => () => {};

export function PlanProvider({ children }: { children: ReactNode }) {
  // False during SSR and the hydration render, true immediately after. Reading
  // localStorage any earlier would make the first client render disagree with
  // the server HTML.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const [clientState, setState] = useState<AppState>(() =>
    typeof window === "undefined" ? emptyState() : loadState(),
  );

  const state = hydrated ? clientState : emptyState();

  // Transient, never persisted: set when a zip resolves so screen 2 shows its
  // loading state once, on arrival, rather than on every visit.
  const [pendingRecommendations, setPendingRecommendations] = useState(false);

  // Custom crops whose why-line is still being generated.
  const [generating, setGenerating] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (hydrated) saveState(clientState);
  }, [clientState, hydrated]);

  const mutatePlan = useCallback((fn: (plan: SeasonPlan) => SeasonPlan) => {
    setState((prev) => (prev.plan ? { ...prev, plan: fn(prev.plan) } : prev));
  }, []);

  const mutateCrops = useCallback(
    (fn: (crops: PlanCrop[]) => PlanCrop[]) => {
      mutatePlan((plan) => ({ ...plan, crops: fn(plan.crops) }));
    },
    [mutatePlan],
  );

  const value = useMemo<PlanContextValue>(() => {
    const plan = state.plan;
    const crops = plan?.crops ?? [];
    const selectedCrops = crops.filter((c) => c.selected);

    return {
      state,
      hydrated,
      plan,
      selectedCrops,
      bedSpace: bedSpaceSqFt(crops, CROPS_BY_ID),

      pendingRecommendations,
      setPendingRecommendations,

      setPlan: (next) => setState((prev) => ({ ...prev, plan: next })),

      applyLocation: (location) =>
        setState((prev) => {
          const zoneChanged = prev.plan?.location.hardinessZone !== location.hardinessZone;
          if (prev.plan) {
            return {
              ...prev,
              plan: {
                ...prev.plan,
                year: planYearFor(location.lastFrostAvg.slice(5)),
                location,
                // A new zone means a new recommendation set; selections the
                // gardener made under the old zone no longer apply.
                crops: zoneChanged ? [] : prev.plan.crops,
              },
            };
          }
          return {
            ...prev,
            plan: {
              id: newId(),
              year: planYearFor(location.lastFrostAvg.slice(5)),
              location,
              crops: [],
              createdAt: new Date().toISOString(),
            },
          };
        }),

      setFrostOverride: (iso) =>
        mutatePlan((plan) => ({
          ...plan,
          location: { ...plan.location, lastFrostOverride: iso },
        })),

      toggleCropFor: (cropId) =>
        mutateCrops((list) => {
          const existing = list.find((c) => c.cropId === cropId);
          if (existing) {
            return list.map((c) =>
              c.id === existing.id ? { ...c, selected: !c.selected } : c,
            );
          }
          // Recommended crops have no plan row until they are first picked,
          // so the stored plan stays exactly as large as the real selection.
          return [
            ...list,
            {
              id: newId(),
              cropId,
              isCustom: false,
              customName: null,
              customDaysToMaturity: null,
              customSowMethod: null,
          customWhy: null,
              quantity: null,
              selected: true,
              addedAt: new Date().toISOString(),
            },
          ];
        }),

      setQuantityFor: (cropId, quantity) =>
        mutateCrops((list) =>
          list.map((c) => (c.cropId === cropId ? { ...c, quantity } : c)),
        ),

      toggleCrop: (planCropId) =>
        mutateCrops((list) =>
          list.map((c) =>
            c.id === planCropId ? { ...c, selected: !c.selected } : c,
          ),
        ),

      setQuantity: (planCropId, quantity) =>
        mutateCrops((list) =>
          list.map((c) => (c.id === planCropId ? { ...c, quantity } : c)),
        ),

      // Unticking rather than deleting: the card stays in the list so the
      // gardener can put it back without re-adding it.
      removeCrop: (planCropId) =>
        mutateCrops((list) =>
          list.map((c) => (c.id === planCropId ? { ...c, selected: false } : c)),
        ),

      // Start Over unticks everything rather than deleting rows: a custom crop
      // was typed by hand, and losing that is worse than losing a checkbox.
      // Everything stays on /crops, recoverable by re-ticking.
      clearSelections: () =>
        mutateCrops((list) => list.map((c) => ({ ...c, selected: false }))),

      addCustomCrop: ({ name, daysToMaturity, sowMethod }) => {
        const id = newId();
        mutateCrops((list) => [
          ...list,
          {
            id,
            cropId: null,
            isCustom: true,
            customName: name,
            customDaysToMaturity: daysToMaturity,
            customSowMethod: sowMethod,
            customWhy: null,
            quantity: null,
            selected: true,
            addedAt: new Date().toISOString(),
          },
        ]);

        // Additive and skippable: the crop is already usable, so a failure
        // here just means the card carries no why-line (PRD §5 Phase 4).
        setGenerating((prev) => new Set(prev).add(id));
        void (async () => {
          let why: string | null = null;
          try {
            const res = await fetch("/api/enrich", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ cropName: name, daysToMaturity, sowMethod }),
              signal: AbortSignal.timeout(30_000),
            });
            if (res.ok) why = ((await res.json()) as { why: string | null }).why;
          } catch {
            why = null;
          }
          if (why) {
            mutateCrops((list) => list.map((c) => (c.id === id ? { ...c, customWhy: why } : c)));
          }
          setGenerating((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        })();
      },

      generatingWhy: generating,

      addCatalogCrop: (cropId) =>
        mutateCrops((list) => {
          const existing = list.find((c) => c.cropId === cropId);
          if (existing) {
            return list.map((c) =>
              c.id === existing.id ? { ...c, selected: true } : c,
            );
          }
          return [
            ...list,
            {
              id: newId(),
              cropId,
              isCustom: false,
              customName: null,
              customDaysToMaturity: null,
              customSowMethod: null,
          customWhy: null,
              quantity: null,
              selected: true,
              addedAt: new Date().toISOString(),
            },
          ];
        }),

      setPrefs: (patch) =>
        setState((prev) => ({ ...prev, prefs: { ...prev.prefs, ...patch } })),

      addLogEntry: (entry) =>
        setState((prev) => ({
          ...prev,
          log: [
            { ...entry, id: newId(), createdAt: new Date().toISOString() },
            ...prev.log,
          ],
        })),

      updateLogEntry: (id, patch) =>
        setState((prev) => ({
          ...prev,
          log: prev.log.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteLogEntry: (id) =>
        setState((prev) => ({ ...prev, log: prev.log.filter((e) => e.id !== id) })),
    };
  }, [state, hydrated, mutateCrops, mutatePlan, pendingRecommendations, generating]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside <PlanProvider>");
  return ctx;
}

export type { SortKey };
