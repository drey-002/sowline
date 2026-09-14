// Every date and area calculation in the app lives here. Screens do no math.
import type { Crop, Location, PlanCrop, SortKey } from "./types";

const MS_PER_DAY = 86_400_000;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Parse an ISO date as UTC so a browser's timezone can never shift the day. */
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISO(new Date(parseISO(iso).getTime() + days * MS_PER_DAY));
}

export function daysBetween(fromISO: string, toISODate: string): number {
  return Math.round((parseISO(toISODate).getTime() - parseISO(fromISO).getTime()) / MS_PER_DAY);
}

/** "2027-04-29" -> "Apr 29" */
export function formatMonthDay(iso: string): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "2027-04-29" -> "04/29/2027", for <input type="date"> helper copy. */
export function formatSlash(iso: string): string {
  const d = parseISO(iso);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getUTCFullYear()}`;
}

// --- Location-derived values (never stored) ---

export function effectiveLastFrost(location: Location): string {
  return location.lastFrostOverride ?? location.lastFrostAvg;
}

export function isOverridden(location: Location): boolean {
  return (
    location.lastFrostOverride !== null &&
    location.lastFrostOverride !== location.lastFrostAvg
  );
}

export function frostFreeDays(location: Location): number {
  return daysBetween(effectiveLastFrost(location), location.firstFrostAvg);
}

// --- Crop-derived dates ---

/** Spring sow date: effective last frost + the crop's offset. */
export function sowDate(crop: Crop, location: Location): string {
  return addDays(effectiveLastFrost(location), crop.sowOffsetDays);
}

/** Second (fall) sow date for spring + fall crops, or null. */
export function fallSowDate(crop: Crop, location: Location): string | null {
  if (crop.fallSowOffsetDays === null) return null;
  return addDays(effectiveLastFrost(location), crop.fallSowOffsetDays);
}

/** End of the acceptable sowing window, or null when the crop is single-sown. */
export function sowWindowEnd(crop: Crop, location: Location): string | null {
  if (crop.sowWindowDays <= 0) return null;
  return addDays(sowDate(crop, location), crop.sowWindowDays);
}

/**
 * The dates portion of a crop card's timing line.
 *   "Apr 29 – Jun 10"  |  "Apr 8 and Aug 5"  |  "May 6"
 */
export function sowDateLabel(crop: Crop, location: Location): string {
  const start = formatMonthDay(sowDate(crop, location));
  const fall = fallSowDate(crop, location);
  if (fall) return `${start} and ${formatMonthDay(fall)}`;
  const end = sowWindowEnd(crop, location);
  return end ? `${start} – ${formatMonthDay(end)}` : start;
}

export function sowMethodLabel(crop: Crop): string {
  return crop.sowMethod === "direct" ? "Direct sow" : "Transplant";
}

/** Full timing line, e.g. "Direct sow Apr 29 – Jun 10 · 50 days to pick · 3 successions fit your season". */
export function timingLine(crop: Crop, location: Location): string {
  const dates = sowDateLabel(crop, location);
  const head = `${sowMethodLabel(crop)} ${dates}${crop.sowNote ? ` (${crop.sowNote})` : ""}`;
  const days = `${crop.daysToMaturity} days${crop.daysToMaturityLabel ? ` ${crop.daysToMaturityLabel}` : ""}`;
  const tail = crop.timingTail ?? crop.yieldNote;
  return [head, days, tail].filter(Boolean).join(" · ");
}

// --- Bed space ---
//
// V1 models every bed as 12" square cells (PRD simplification):
//   row feet -> one cell per row foot
//   plants   -> ceil(count / plants that fit one cell)
// A plot-size calculator is explicitly out of scope for V1.

export function cropAreaSqFt(crop: Crop, quantity: number): number {
  if (crop.quantityUnit === "row_feet") return quantity;
  return Math.ceil(quantity / crop.plantsPerSqFt);
}

export function quantityOf(planCrop: PlanCrop): number {
  return planCrop.quantity ?? 1;
}

export function bedSpaceSqFt(planCrops: PlanCrop[], cropsById: Map<string, Crop>): number {
  let total = 0;
  for (const pc of planCrops) {
    if (!pc.selected) continue;
    const crop = pc.cropId ? cropsById.get(pc.cropId) : undefined;
    // Custom crops have no spacing data; assume one cell per unit.
    if (!crop) {
      total += quantityOf(pc);
      continue;
    }
    total += cropAreaSqFt(crop, quantityOf(pc));
  }
  return Math.round(total);
}

// --- Ranking ---

/** "6b" -> 13, so zone ranges can be compared numerically. */
export function zoneOrdinal(zone: string): number {
  const match = /^(\d+)([ab])$/.exec(zone.trim().toLowerCase());
  if (!match) return Number.NaN;
  return Number(match[1]) * 2 + (match[2] === "b" ? 1 : 0);
}

export function zoneInRange(zone: string, min: string, max: string): boolean {
  const z = zoneOrdinal(zone);
  if (Number.isNaN(z)) return false;
  return z >= zoneOrdinal(min) && z <= zoneOrdinal(max);
}

export function sortCrops(crops: Crop[], sortBy: SortKey): Crop[] {
  const sorted = [...crops];
  switch (sortBy) {
    case "earliest":
      return sorted.sort((a, b) => a.sowOffsetDays - b.sowOffsetDays);
    case "maintenance":
      // Crops that are not succession-planted ask the least of you.
      return sorted.sort((a, b) => {
        const an = a.successionIntervalDays === null ? 0 : 1;
        const bn = b.successionIntervalDays === null ? 0 : 1;
        return an - bn || b.yieldPerSqFt - a.yieldPerSqFt;
      });
    case "yield":
    default:
      return sorted.sort((a, b) => b.yieldPerSqFt - a.yieldPerSqFt);
  }
}

/** Filter the catalog to what suits this zone and season, then take the top 5. */
export function recommendCrops(
  catalog: Crop[],
  zone: string,
  frostFree: number,
  sortBy: SortKey = "yield",
): Crop[] {
  const eligible = catalog.filter(
    (c) => zoneInRange(zone, c.minZone, c.maxZone) && c.daysToMaturity <= frostFree,
  );
  const topFive = sortCrops(eligible, "yield").slice(0, 5);
  return sortCrops(topFive, sortBy);
}

/**
 * Plan year is season-aware rather than hard-coded: once this year's last
 * frost has passed, you are planning next spring.
 */
export function planYearFor(lastFrostMonthDay: string, today = new Date()): number {
  const year = today.getUTCFullYear();
  const lastFrost = parseISO(`${year}-${lastFrostMonthDay}`);
  return today.getTime() > lastFrost.getTime() ? year + 1 : year;
}

/**
 * Chronological order for the planting plan: earliest sow date first, so the
 * page reads as a schedule. Custom crops carry no offset, so they sort last in
 * the order they were added.
 */
export function bySowDate(
  planCrops: PlanCrop[],
  cropsById: Map<string, Crop>,
): PlanCrop[] {
  return [...planCrops].sort((a, b) => {
    const cropA = a.cropId ? cropsById.get(a.cropId) : undefined;
    const cropB = b.cropId ? cropsById.get(b.cropId) : undefined;
    if (!cropA && !cropB) return a.addedAt.localeCompare(b.addedAt);
    if (!cropA) return 1;
    if (!cropB) return -1;
    return cropA.sowOffsetDays - cropB.sowOffsetDays;
  });
}
