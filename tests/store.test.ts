import { beforeEach, describe, expect, it } from "vitest";
import { emptyState, migrate } from "@/lib/store";
import { isWellFormedZip } from "@/lib/lookup";

describe("zip validation", () => {
  it("accepts exactly five digits", () => {
    expect(isWellFormedZip("47404")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of ["4740", "474044", "4740a", "", " 47404", "abcde"]) {
      expect(isWellFormedZip(bad), bad).toBe(false);
    }
  });
});

describe("schema migration", () => {
  const RAW = "{}"; // stands in for the original text; only backup uses it

  it("walks a v1 plan forward to v2", () => {
    const v1 = {
      version: 1,
      plan: {
        id: "p1",
        year: 2027,
        location: { hardinessZone: "6b" },
        crops: [{ id: "pc1", cropId: "bush-bean-provider", selected: true }],
      },
      log: [{ id: "l1", cropName: "Bush beans" }],
      prefs: { showWhy: true, sortBy: "earliest" },
    };
    const out = migrate(v1 as never, RAW);
    expect(out).not.toBeNull();
    expect(out!.version).toBe(2);
    // The v2 field is added without disturbing what was already there.
    expect(out!.plan!.crops[0].customWhy).toBeNull();
    expect(out!.plan!.crops[0].cropId).toBe("bush-bean-provider");
    expect(out!.log).toHaveLength(1);
    expect(out!.prefs.showWhy).toBe(true);
    expect(out!.prefs.sortBy).toBe("earliest");
  });

  it("does not overwrite a customWhy that already exists", () => {
    const v1 = {
      version: 1,
      plan: { id: "p1", year: 2027, location: {}, crops: [{ id: "pc1", customWhy: "kept" }] },
      log: [],
      prefs: {},
    };
    expect(migrate(v1 as never, RAW)!.plan!.crops[0].customWhy).toBe("kept");
  });

  it("handles a v1 state with no plan", () => {
    const out = migrate({ version: 1, plan: null, log: [], prefs: {} } as never, RAW);
    expect(out!.plan).toBeNull();
    expect(out!.version).toBe(2);
  });

  it("passes a current-version state through untouched", () => {
    const v2 = { version: 2, plan: null, log: [{ id: "l1" }], prefs: { showWhy: true } };
    const out = migrate(v2 as never, RAW);
    expect(out!.version).toBe(2);
    expect(out!.log).toHaveLength(1);
  });

  // Refusing is the point: an older build must not overwrite newer data.
  it("refuses data from a future version rather than destroying it", () => {
    expect(migrate({ version: 99, plan: null, log: [], prefs: {} } as never, RAW)).toBeNull();
  });

  it("refuses a version it has no migration path for", () => {
    expect(migrate({ version: 0, plan: null, log: [], prefs: {} } as never, RAW)).toBeNull();
  });

  it("tolerates missing fields without throwing", () => {
    const out = migrate({ version: 1 } as never, RAW);
    expect(out!.plan).toBeNull();
    expect(out!.log).toEqual([]);
    expect(out!.prefs).toEqual(emptyState().prefs);
  });
});
