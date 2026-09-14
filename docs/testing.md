# Writing tests for Sowline

## What's set up

- **Runner:** [Vitest](https://vitest.dev) — reads `vitest.config.ts`
- **Location:** `tests/*.test.ts`
- **Imports:** use the same `@/lib/...` aliases the app uses
- **Environment:** `node` — no browser, because everything tested is pure logic

```bash
npm test          # run once
npm run test:watch  # re-run on save while you work
```

## What to test, and what not to

Test **pure functions** — ones that take values in and return values out, touching
nothing else. In this codebase that is almost entirely `lib/derive.ts`: date math,
zone comparison, ranking, bed space. These are worth testing because a bug there is
*silent*: nothing crashes, the app just tells someone to plant tomatoes two weeks early.

Don't write tests for React components yet. They need a browser environment and a
library (Testing Library), they break whenever markup changes, and they'd mostly
re-check things you can see with your own eyes. Logic first.

## The shape of a test

```ts
import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/derive";

describe("date arithmetic", () => {   // a group of related tests
  it("adds days across a month boundary", () => {   // one behaviour
    expect(addDays("2027-04-29", 42)).toBe("2027-06-10");
    //     ^ call the thing    ^ assert what it should equal
  });
});
```

Three rules that make tests worth having:

1. **The name states the behaviour, not the function.** `"adds days across a month
   boundary"` tells you what broke when it fails. `"test addDays"` doesn't.
2. **One behaviour per `it`.** If a test fails you should know what's wrong without
   reading it.
3. **Assert the real expected value, not a re-computation.** Write `.toBe("2027-06-10")`,
   never `.toBe(addDays("2027-04-29", 42))` — that passes even when the code is wrong.

## The four cases worth covering for any function

Look at `tests/derive.test.ts` and you'll see this pattern repeatedly:

| Case | Example from our suite |
|---|---|
| The normal one | `frostFreeDays` returns 182 for Bloomington |
| The boundary | `zoneInRange("6a", "3a", "6a")` is `true` — the endpoint counts |
| The edge that breaks things | leap day: `addDays("2028-02-28", 1)` |
| The invalid input | `zoneOrdinal("banana")` returns `NaN` instead of throwing |

Most real bugs live in the last three.

## Gaps left for you to fill in

These are genuinely untested. Each is a good exercise, roughly in order of difficulty:

1. **`lib/lookup.ts` — `isWellFormedZip`.** Should accept `"47404"`, reject `"4740"`,
   `"474044"`, `"4740a"`, `""`. Pure function, five assertions, no async.
2. **`lib/lookup.ts` — `locationFromZone`.** Given `("6b", "2027-04-28", "47404")`, check
   the zone, that the override is the date you passed, and that `firstFrostAvg` came from
   the zone defaults.
3. **`data/zones.ts` integrity.** Every record should have a zone that `zoneOrdinal` can
   parse, and `MM-DD` frost dates that match `/^\d{2}-\d{2}$/`. This is the same idea as
   the "catalog integrity" block already in the suite — copy that pattern.
4. **`data/companions.ts` integrity.** Every `cropAId` and `cropBId` should exist in
   `CROPS_BY_ID`, no pair should reference the same crop twice, and no two pairs should
   describe the same couple. *(A typo'd crop id here silently shows nothing on screen —
   exactly the kind of bug tests catch and eyes don't.)*
5. **`lib/store.ts` migration.** Hardest, because it touches `localStorage`. You'd need
   `environment: "jsdom"` for that file, or to refactor `migrate()` to take the parsed
   object directly — it already does, so you can test it without any browser at all.

## Handoff prompt

If you'd rather work on these in a separate Claude session, paste this:

> I'm adding tests to a Next.js + TypeScript app called Sowline (a vegetable garden
> season planner). It uses Vitest, configured in `vitest.config.ts` with
> `vite-tsconfig-paths` so `@/lib/...` imports work, environment `node`, tests in
> `tests/*.test.ts`. There's an existing suite at `tests/derive.test.ts` covering
> `lib/derive.ts` — read it first and match its style: behaviour-describing test names,
> one behaviour per `it`, literal expected values rather than re-computed ones, and a
> `describe` block per area.
>
> Help me write tests for [pick one: `lib/lookup.ts`, `data/zones.ts` integrity,
> `data/companions.ts` referential integrity, or `lib/store.ts` migration]. Walk me
> through the cases to cover before writing code, and explain why each one matters.
> I want to learn the reasoning, not just get a file.

## When a test fails

Read the diff Vitest prints — it shows expected vs actual. Then ask which is wrong:
the code, or the test's expectation. Both happen. If a test fails because the intended
behaviour genuinely changed, update the test and say so in the commit message.

---

## Added in Phase 4

`tests/store.test.ts` covers zip validation and schema migration. The migration
tests are worth reading as a pattern: `migrate()` takes a plain object and returns
one, so it needs no browser at all despite being the code that guards localStorage.
That's not an accident — it was written that way *so* it could be tested.

Note the two tests asserting migration **refuses** rather than succeeds (future
version, no migration path). Refusing is the feature: an older build must never
overwrite newer data. A test that only checked the happy path would let that
regress silently.

Gap 5 from the list above is now done. Gaps 1-4 are still open.
