import { describe, expect, it } from "vitest";
import {
  addDays,
  bedSpaceSqFt,
  bySowDate,
  cropAreaSqFt,
  daysBetween,
  effectiveLastFrost,
  fallSowDate,
  formatMonthDay,
  frostFreeDays,
  isOverridden,
  planYearFor,
  recommendCrops,
  sortCrops,
  sowDate,
  sowDateLabel,
  timingLine,
  zoneInRange,
  zoneOrdinal,
} from "@/lib/derive";
import { CROPS, CROPS_BY_ID } from "@/data/crops";
import type { Crop, Location, PlanCrop } from "@/lib/types";

/** The Bloomington fixture every approved screenshot was drawn from. */
const BLOOMINGTON: Location = {
  zipCode: "47404",
  city: "Bloomington, IN",
  hardinessZone: "6b",
  lastFrostAvg: "2027-04-22",
  lastFrostOverride: null,
  firstFrostAvg: "2027-10-21",
  resolvedAt: "2026-09-01T12:00:00.000Z",
};

const crop = (id: string): Crop => {
  const found = CROPS_BY_ID.get(id);
  if (!found) throw new Error(`no crop ${id}`);
  return found;
};

describe("date arithmetic", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2027-04-29", 42)).toBe("2027-06-10");
  });

  it("handles negative offsets", () => {
    expect(addDays("2027-04-22", -14)).toBe("2027-04-08");
  });

  it("counts days between two dates", () => {
    expect(daysBetween("2027-04-22", "2027-10-21")).toBe(182);
  });

  it("formats a month and day", () => {
    expect(formatMonthDay("2027-04-29")).toBe("Apr 29");
  });

  it("crosses a leap day correctly", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("frost dates", () => {
  it("uses the average when no override is set", () => {
    expect(effectiveLastFrost(BLOOMINGTON)).toBe("2027-04-22");
    expect(isOverridden(BLOOMINGTON)).toBe(false);
    expect(frostFreeDays(BLOOMINGTON)).toBe(182);
  });

  it("lets an override win and shortens the season", () => {
    const edited = { ...BLOOMINGTON, lastFrostOverride: "2027-04-29" };
    expect(effectiveLastFrost(edited)).toBe("2027-04-29");
    expect(isOverridden(edited)).toBe(true);
    expect(frostFreeDays(edited)).toBe(175);
  });

  it("does not treat an override equal to the average as edited", () => {
    expect(isOverridden({ ...BLOOMINGTON, lastFrostOverride: "2027-04-22" })).toBe(false);
  });
});

describe("sow dates", () => {
  it("matches the approved screenshot dates", () => {
    expect(formatMonthDay(sowDate(crop("bush-bean-provider"), BLOOMINGTON))).toBe("Apr 29");
    expect(formatMonthDay(sowDate(crop("paste-tomato-roma"), BLOOMINGTON))).toBe("May 6");
    expect(formatMonthDay(sowDate(crop("lacinato-kale"), BLOOMINGTON))).toBe("Apr 15");
    expect(formatMonthDay(sowDate(crop("beet-detroit-dark-red"), BLOOMINGTON))).toBe("Apr 8");
  });

  it("gives spring + fall crops a second date", () => {
    const fall = fallSowDate(crop("beet-detroit-dark-red"), BLOOMINGTON);
    expect(fall).not.toBeNull();
    expect(formatMonthDay(fall!)).toBe("Aug 5");
  });

  it("returns null for single-sown crops", () => {
    expect(fallSowDate(crop("paste-tomato-roma"), BLOOMINGTON)).toBeNull();
  });

  it("labels a window, a pair, and a single date differently", () => {
    expect(sowDateLabel(crop("bush-bean-provider"), BLOOMINGTON)).toBe("Apr 29 - Jun 10".replace("-", "–"));
    expect(sowDateLabel(crop("beet-detroit-dark-red"), BLOOMINGTON)).toBe("Apr 8 and Aug 5");
    expect(sowDateLabel(crop("paste-tomato-roma"), BLOOMINGTON)).toBe("May 6");
  });

  it("builds the full timing line", () => {
    expect(timingLine(crop("bush-bean-provider"), BLOOMINGTON)).toContain("Direct sow Apr 29");
    expect(timingLine(crop("bush-bean-provider"), BLOOMINGTON)).toContain("50 days to pick");
    expect(timingLine(crop("bush-bean-provider"), BLOOMINGTON)).toContain("3 successions fit your season");
  });

  it("shifts every date when the frost override moves", () => {
    const edited = { ...BLOOMINGTON, lastFrostOverride: "2027-04-29" };
    expect(formatMonthDay(sowDate(crop("bush-bean-provider"), edited))).toBe("May 6");
    expect(formatMonthDay(sowDate(crop("lacinato-kale"), edited))).toBe("Apr 22");
  });
});

describe("zone comparison", () => {
  it("orders zones numerically", () => {
    expect(zoneOrdinal("3a")).toBeLessThan(zoneOrdinal("3b"));
    expect(zoneOrdinal("6b")).toBeLessThan(zoneOrdinal("7a"));
    expect(zoneOrdinal("10b")).toBeLessThan(zoneOrdinal("11a"));
  });

  it("treats a malformed zone as out of range rather than throwing", () => {
    expect(Number.isNaN(zoneOrdinal("banana"))).toBe(true);
    expect(zoneInRange("banana", "3a", "11b")).toBe(false);
  });

  it("includes both endpoints", () => {
    expect(zoneInRange("3a", "3a", "6a")).toBe(true);
    expect(zoneInRange("6a", "3a", "6a")).toBe(true);
    expect(zoneInRange("6b", "3a", "6a")).toBe(false);
  });
});

describe("recommendations", () => {
  it("returns the five crops on the approved screenshot, in order", () => {
    expect(recommendCrops(CROPS, "6b", 182).map((c) => c.id)).toEqual([
      "bush-bean-provider",
      "paste-tomato-roma",
      "lacinato-kale",
      "beet-detroit-dark-red",
      "zucchini-costata-romanesco",
    ]);
  });

  it("gives a cold zone a visibly different set", () => {
    const warm = recommendCrops(CROPS, "6b", 182).map((c) => c.id);
    const cold = recommendCrops(CROPS, "4b", 146).map((c) => c.id);
    expect(cold).not.toEqual(warm);
    expect(cold.filter((id) => warm.includes(id)).length).toBeLessThan(4);
  });

  it("never returns more than five", () => {
    expect(recommendCrops(CROPS, "7a", 200).length).toBeLessThanOrEqual(5);
  });

  it("excludes crops that cannot mature in the window", () => {
    expect(recommendCrops(CROPS, "6b", 40).every((c) => c.daysToMaturity <= 40)).toBe(true);
  });

  it("returns nothing rather than throwing for an impossible season", () => {
    expect(recommendCrops(CROPS, "6b", 1)).toEqual([]);
  });

  it("re-sorts the same five without changing membership", () => {
    const base = recommendCrops(CROPS, "6b", 182).map((c) => c.id).sort();
    for (const key of ["earliest", "maintenance"] as const) {
      expect(recommendCrops(CROPS, "6b", 182, key).map((c) => c.id).sort()).toEqual(base);
    }
  });

  it("sorts by earliest sow date ascending", () => {
    const offsets = recommendCrops(CROPS, "6b", 182, "earliest").map((c) => c.sowOffsetDays);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it("puts non-succession crops first under least maintenance", () => {
    const list = sortCrops(recommendCrops(CROPS, "6b", 182), "maintenance");
    const lastNone = list.map((c) => c.successionIntervalDays).lastIndexOf(null);
    const firstSome = list.findIndex((c) => c.successionIntervalDays !== null);
    if (firstSome !== -1 && lastNone !== -1) expect(lastNone).toBeLessThan(firstSome);
  });
});

describe("catalog integrity", () => {
  it("seeds at least the 24 crops the PRD requires", () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(24);
  });

  it("has unique ids", () => {
    expect(new Set(CROPS.map((c) => c.id)).size).toBe(CROPS.length);
  });

  it("has a valid zone range on every crop", () => {
    for (const c of CROPS) {
      expect(Number.isNaN(zoneOrdinal(c.minZone)), `${c.id} minZone`).toBe(false);
      expect(Number.isNaN(zoneOrdinal(c.maxZone)), `${c.id} maxZone`).toBe(false);
      expect(zoneOrdinal(c.minZone), `${c.id} range`).toBeLessThanOrEqual(zoneOrdinal(c.maxZone));
    }
  });

  it("has a positive maturity and yield on every crop", () => {
    for (const c of CROPS) {
      expect(c.daysToMaturity, c.id).toBeGreaterThan(0);
      expect(c.yieldPerSqFt, c.id).toBeGreaterThan(0);
      expect(c.plantsPerSqFt, c.id).toBeGreaterThan(0);
    }
  });

  it("gives every crop a why-line for the Show why toggle", () => {
    for (const c of CROPS) expect(c.whyStrategic.length, c.id).toBeGreaterThan(10);
  });
});

describe("bed space (12-inch cell model)", () => {
  const planCrop = (cropId: string, quantity: number | null, selected = true): PlanCrop => ({
    id: `pc-${cropId}`,
    cropId,
    isCustom: false,
    customName: null,
    customDaysToMaturity: null,
    customSowMethod: null,
    customWhy: null,
    quantity,
    selected,
    addedAt: "2026-09-01T00:00:00.000Z",
  });

  it("counts one square foot per row foot", () => {
    expect(cropAreaSqFt(crop("bush-bean-provider"), 12)).toBe(12);
  });

  it("rounds plant counts up to whole cells", () => {
    expect(cropAreaSqFt(crop("zucchini-costata-romanesco"), 1)).toBe(4);
    expect(cropAreaSqFt(crop("paste-tomato-roma"), 6)).toBe(6);
  });

  it("totals the agreed fixture at 26 sq ft", () => {
    expect(
      bedSpaceSqFt(
        [
          planCrop("bush-bean-provider", 12),
          planCrop("paste-tomato-roma", 6),
          planCrop("lacinato-kale", 8),
        ],
        CROPS_BY_ID,
      ),
    ).toBe(26);
  });

  it("ignores unselected crops", () => {
    expect(
      bedSpaceSqFt(
        [planCrop("bush-bean-provider", 12), planCrop("paste-tomato-roma", 6, false)],
        CROPS_BY_ID,
      ),
    ).toBe(12);
  });

  it("treats a blank quantity as one", () => {
    expect(bedSpaceSqFt([planCrop("lacinato-kale", null)], CROPS_BY_ID)).toBe(1);
  });
});

describe("planting plan order", () => {
  const pc = (cropId: string | null, addedAt: string, customName: string | null = null): PlanCrop => ({
    id: `pc-${cropId ?? customName}`,
    cropId,
    isCustom: cropId === null,
    customName,
    customDaysToMaturity: null,
    customSowMethod: null,
    customWhy: null,
    quantity: null,
    selected: true,
    addedAt,
  });

  it("orders by sow date regardless of selection order", () => {
    const scrambled = [
      pc("paste-tomato-roma", "2026-09-01T00:00:00Z"),
      pc("beet-detroit-dark-red", "2026-09-01T00:00:01Z"),
      pc("bush-bean-provider", "2026-09-01T00:00:02Z"),
      pc("lacinato-kale", "2026-09-01T00:00:03Z"),
    ];
    expect(bySowDate(scrambled, CROPS_BY_ID).map((c) => c.cropId)).toEqual([
      "beet-detroit-dark-red",
      "lacinato-kale",
      "bush-bean-provider",
      "paste-tomato-roma",
    ]);
  });

  it("puts custom crops last, oldest first", () => {
    const list = [
      pc(null, "2026-09-02T00:00:00Z", "Tomatillo"),
      pc("bush-bean-provider", "2026-09-01T00:00:00Z"),
      pc(null, "2026-09-01T00:00:00Z", "Ground cherry"),
    ];
    expect(bySowDate(list, CROPS_BY_ID).map((c) => c.cropId ?? c.customName)).toEqual([
      "bush-bean-provider",
      "Ground cherry",
      "Tomatillo",
    ]);
  });
});

describe("plan year", () => {
  it("plans next season once this year's last frost has passed", () => {
    expect(planYearFor("04-22", new Date("2026-09-14T00:00:00Z"))).toBe(2027);
  });

  it("plans this season while the last frost is still ahead", () => {
    expect(planYearFor("04-22", new Date("2027-02-01T00:00:00Z"))).toBe(2027);
  });

  it("flips the day after the last frost", () => {
    expect(planYearFor("04-22", new Date("2027-04-21T00:00:00Z"))).toBe(2027);
    expect(planYearFor("04-22", new Date("2027-04-23T00:00:00Z"))).toBe(2028);
  });
});
