// Domain types for Sowline. Mirrors PRD §3, with three documented additions:
//   - Crop.fallSowOffsetDays  — a crop can carry a second sow date (spring + fall)
//   - Crop.plantsPerSqFt      — V1 bed-space math uses 12" cells, not spacing areas
//   - AppState.prefs          — screen-2 toggles persist under the single root key

export type CropCategory =
  | "legume"
  | "fruiting"
  | "root"
  | "brassica"
  | "green"
  | "allium"
  | "cucurbit"
  | "herb";

export type SowMethod = "direct" | "transplant";
export type FrostTolerance = "tender" | "half-hardy" | "hardy";
export type SunNeeds = "full" | "partial" | "shade-tolerant";
export type QuantityUnit = "row_feet" | "plants";
export type Relationship = "companion" | "antagonist";
export type LocationType = "container" | "ground";
export type SunExposure = "full" | "partial" | "shade";

/** The three sort options on screen 2. */
export type SortKey = "yield" | "earliest" | "maintenance";

export interface Crop {
  id: string;
  name: string;
  variety: string | null;
  category: CropCategory;
  sowMethod: SowMethod;
  /** Days relative to the effective last frost. Negative = before frost. */
  sowOffsetDays: number;
  /** Second sow date for spring + fall crops. Null when single-sown. */
  fallSowOffsetDays: number | null;
  /** Length of the acceptable sowing window. 0 renders a single date. */
  sowWindowDays: number;
  daysToMaturity: number;
  /** Suffix on the days count, e.g. "to pick". */
  daysToMaturityLabel: string | null;
  successionIntervalDays: number | null;
  frostTolerance: FrostTolerance;
  yieldPerSqFt: number;
  yieldNote: string | null;
  whyStrategic: string;
  containerFriendly: boolean;
  cautionTag: string | null;
  /** Neutral descriptors: DETERMINATE, CUT & COME AGAIN, SPRING + FALL. */
  descriptorTags: string[];
  /** Authored parenthetical after the sow date, e.g. "2 wks after frost". */
  sowNote: string | null;
  /** Authored tail of the timing line. Falls back to yieldNote. */
  timingTail: string | null;
  spacingInches: number;
  rowSpacingInches: number;
  /** How many plants fit one 12" cell. Drives the bed-space estimate. */
  plantsPerSqFt: number;
  depthInches: number;
  sunNeeds: SunNeeds;
  soilMix: string;
  quantityUnit: QuantityUnit;
  minZone: string;
  maxZone: string;
}

export interface Location {
  zipCode: string;
  city: string;
  hardinessZone: string;
  lastFrostAvg: string;
  lastFrostOverride: string | null;
  firstFrostAvg: string;
  resolvedAt: string;
}

export interface PlanCrop {
  id: string;
  cropId: string | null;
  isCustom: boolean;
  customName: string | null;
  customDaysToMaturity: number | null;
  customSowMethod: SowMethod | null;
  /** Generated "Why:" line for a custom crop. Null until (or unless) it lands. */
  customWhy: string | null;
  quantity: number | null;
  selected: boolean;
  addedAt: string;
}

export interface SeasonPlan {
  id: string;
  year: number;
  location: Location;
  crops: PlanCrop[];
  createdAt: string;
}

export interface CompanionPair {
  id: string;
  cropAId: string;
  cropBId: string;
  relationship: Relationship;
  reason: string;
}

export interface LogEntry {
  id: string;
  planCropId: string | null;
  cropName: string;
  locationType: LocationType;
  locationDetail: string | null;
  sunExposure: SunExposure;
  datePlanted: string;
  note: string | null;
  createdAt: string;
}

export interface Prefs {
  showWhy: boolean;
  sortBy: SortKey;
}

export interface AppState {
  version: number;
  plan: SeasonPlan | null;
  log: LogEntry[];
  prefs: Prefs;
}
