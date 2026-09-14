// Zone resolution. Phase 2 reads the bundled dataset behind a simulated
// network delay so the loading states on screens 1 and 2 are real; Phase 4
// swaps the body of resolveZip for a live call and keeps this signature.
import { ZONES_BY_PREFIX, ZONE_DEFAULTS } from "@/data/zones";
import { planYearFor } from "./derive";
import type { Location } from "./types";

/** The zip is well-formed but not in the dataset — screen 1 shows it inline. */
export class ZipNotFoundError extends Error {
  constructor(zip: string) {
    super(`No zone record for zip ${zip}`);
    this.name = "ZipNotFoundError";
  }
}

const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 800;

function simulatedDelay(): Promise<void> {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isWellFormedZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

export async function resolveZip(zip: string): Promise<Location> {
  await simulatedDelay();

  const record = ZONES_BY_PREFIX[zip.slice(0, 3)];
  if (!record) throw new ZipNotFoundError(zip);

  const year = planYearFor(record.lastFrost);
  return {
    zipCode: zip,
    city: record.city,
    hardinessZone: record.zone,
    lastFrostAvg: `${year}-${record.lastFrost}`,
    lastFrostOverride: null,
    firstFrostAvg: `${year}-${record.firstFrost}`,
    resolvedAt: new Date().toISOString(),
  };
}

/**
 * Manual fallback: the gardener picks a zone when their zip is unknown. There
 * is no zip to derive from, so frost dates come from the zone's typical range
 * and the last-frost date is required from the user.
 */
export function locationFromZone(zone: string, lastFrostISO: string, zip: string): Location {
  const defaults = ZONE_DEFAULTS[zone];
  const year = planYearFor(defaults.lastFrost);
  return {
    zipCode: zip,
    city: `Zone ${zone} (entered by hand)`,
    hardinessZone: zone,
    lastFrostAvg: `${year}-${defaults.lastFrost}`,
    lastFrostOverride: lastFrostISO,
    firstFrostAvg: `${year}-${defaults.firstFrost}`,
    resolvedAt: new Date().toISOString(),
  };
}

/**
 * Ranking runs locally, but it sits behind the same async seam the live
 * recommendations API will use in Phase 4 — that is what gives screen 2 a
 * genuine loading state and a reachable failure panel.
 */
export class RecommendationError extends Error {
  constructor() {
    super("Could not load recommendations");
    this.name = "RecommendationError";
  }
}

export async function fetchRecommendations<T>(compute: () => T): Promise<T> {
  await simulatedDelay();
  try {
    return compute();
  } catch {
    throw new RecommendationError();
  }
}
