# Sowline — Product Requirements Document

Version 1.1 · as built · September 2026

> **Status:** all four phases in §5 are complete. This document has been
> reconciled against the shipped code — where the build differs from the
> original spec the text below describes what exists, and §7 records why.

Wireframes referenced in this document live in `Crop Recommendations.dc.html` (all screens and states) and `Desktop - Mobile Pairs.dc.html` (desktop next to mobile). Exported screenshots are in `docs/design/`, named `<screen>_<state>.png` — e.g. `crop reco_filled.png`, `zone and frost setup_error.png`. Only screens 1 and 2 were ever wireframed; screens 3–5 were built to the written spec in §4.4.

---

## 1. Overview

### What it is
Sowline is a season planning tool for vegetable gardens. The gardener enters a zip code; the app resolves their USDA hardiness zone and average last frost date, then recommends five vegetables ranked by usable yield per square foot for the length of their frost-free window. The gardener selects crops, gets per-crop planting specs (timing, spacing, depth, soil, sun), sees companion pairings for what they picked, and logs what actually went in the ground.

### Who it is for
A gardener with two or more seasons of experience who already knows how to grow things but plans loosely — plants whatever looks good at the nursery, runs out of bed space, and ends up with three zucchini plants and no succession. They want to be strategic and get more food out of the same beds this season.

The product's whole point of view: **every recommendation carries a reason tied to yield or season length.** A crop is not "easy" or "popular" — it is "fastest turnaround here, so one bed produces three times."

### What V1 does
Five screens, in order, as a linear planning flow:

1. **Zone & Frost Setup** — zip code entry, auto-resolved hardiness zone, auto-resolved last frost date with a hand-editable override.
2. **Crop Recommendations (main screen)** — five recommended crops for the zone and frost date, with selection controls, per-crop quantity, and a custom crop add.
3. **Planting Plan** — for each selected crop: timing, spacing, depth, soil mix, sun needs.
4. **Companion Planting** — companion pairings limited to the crops the gardener actually selected.
5. **My Garden Log** — entries recording crop, location (container or ground), and sun exposure.

Single user, no accounts. Data is per-browser. Desktop-first, works down to 390px.

### What V1 does not do
No accounts, no marketing site, no notifications or reminders, no indoor seed-starting instructions, no harvest or yield tracking, no preservation, no spreadsheet import. See §6 for the full list and reasons.

---

## 2. Starting point

Create the app fresh:

```bash
npx create-next-app@latest sowline --typescript --tailwind --app --eslint
```

Explicitly: **a new Next.js app from `create-next-app`, TypeScript, Tailwind CSS, App Router.** No existing codebase, no monorepo, no other starter.

Additional constraints:

- **UI components:** standard HTML form elements, lists, buttons, and divs styled with Tailwind. No component library, no headless UI kit, no drag-and-drop, no charting library, no date-picker library — use `<input type="date">`. Anything a beginner cannot read in one pass does not belong here.
- **Persistence:** `localStorage` behind a single typed data-access module (`lib/store.ts`) so it can be swapped for a database later without touching screens. No backend database in V1.
- **State:** React state and one React context for the active season plan. No Redux, no Zustand, no server actions required.
- **Routing:** App Router, one route per screen:
  - `/setup` → Zone & Frost Setup
  - `/crops` → Crop Recommendations (also the app's default landing route: `/` redirects to `/crops`, which redirects to `/setup` when no zone is set)
  - `/plan` → Planting Plan
  - `/companions` → Companion Planting
  - `/log` → My Garden Log
- **Crop data:** ships as a static seed file (`data/crops.ts`, `data/companions.ts`). The catalog itself is never fetched. Two route handlers were added in Phase 4 — `/api/zone` and `/api/enrich` — both optional, neither a content API for the catalog. There is still no backend database.

---

## 3. Data model

Everything is stored in `localStorage` under one root key, `sowline.v1`, shaped as the `AppState` object below. Types live in `lib/types.ts`.

### Plain English

There is **one season plan** at a time. It points at a **location** (the zip code, zone, and frost dates) and holds a list of **plan crops** — the gardener's selections. Each plan crop points at a **crop** in the built-in catalog, or, if it is a custom crop, carries its own name and days-to-maturity instead. The catalog also has a table of **companion pairs** describing which crops help or hurt each other. Finally, **log entries** record what actually got planted, each optionally linked back to a plan crop.

Relationships:

- `SeasonPlan` 1 → 1 `Location`
- `SeasonPlan` 1 → many `PlanCrop`
- `PlanCrop` many → 1 `Crop` (null when `isCustom` is true)
- `CompanionPair` many → 2 `Crop` (by `cropAId` / `cropBId`)
- `SeasonPlan` 1 → many `LogEntry`; `LogEntry` many → 0..1 `PlanCrop`

### AppState (root object)

| Field | Type | Notes |
|---|---|---|
| `version` | `number` | Schema version. Started at `1`; now `2` (see §7) |
| `plan` | `SeasonPlan \| null` | Null before first setup |
| `log` | `LogEntry[]` | Flat list, newest first |
| `prefs` | `Prefs` | `{ showWhy, sortBy }` — screen-2 toggles, persisted under the same root key |

### Location

Resolved from the zip code, with one user-editable field.

| Field | Type | Notes |
|---|---|---|
| `zipCode` | `string` | 5 digits, US only |
| `city` | `string` | Display only, e.g. "Bloomington, IN" |
| `hardinessZone` | `string` | e.g. `"6b"`. Read-only to the user |
| `lastFrostAvg` | `string` (ISO date) | Average last spring frost from the zone dataset |
| `lastFrostOverride` | `string \| null` | User's edit; when set, this wins |
| `firstFrostAvg` | `string` (ISO date) | Average first fall frost |
| `resolvedAt` | `string` (ISO datetime) | When the lookup succeeded |

Derived, never stored: `effectiveLastFrost = lastFrostOverride ?? lastFrostAvg`, and `frostFreeDays = daysBetween(effectiveLastFrost, firstFrostAvg)`.

### SeasonPlan

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | uuid |
| `year` | `number` | e.g. `2027` |
| `location` | `Location` | Embedded, one per plan |
| `crops` | `PlanCrop[]` | The selection list |
| `createdAt` | `string` (ISO datetime) | |

### Crop (built-in catalog, read-only)

Seed at least 24 common vegetables so recommendations differ by zone. Fields marked ▸ drive the ranking or the copy on screen 2.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | slug, e.g. `bush-bean-provider` |
| `name` | `string` | e.g. `"Bush beans"` |
| `variety` | `string \| null` | e.g. `"Provider"` |
| `category` | `"legume" \| "fruiting" \| "root" \| "brassica" \| "green" \| "allium" \| "cucurbit" \| "herb"` | Used by companion logic |
| `sowMethod` | `"direct" \| "transplant"` | |
| `sowOffsetDays` | `number` | Days relative to effective last frost; negative = before frost (kale `-7`, beans `+7`, tomato `+14`). Defaults to `+1` where a crop has no specific requirement |
| `fallSowOffsetDays` | `number \| null` | Second sow date for spring + fall crops (beets `105` → Aug 5). Null when single-sown |
| `sowWindowDays` | `number` | Length of the acceptable sowing window |
| `daysToMaturity` | `number` | ▸ |
| `daysToMaturityLabel` | `string \| null` | Suffix on the days count, e.g. `"to pick"` |
| `successionIntervalDays` | `number \| null` | ▸ Null when the crop is not succession-planted |
| `frostTolerance` | `"tender" \| "half-hardy" \| "hardy"` | ▸ Gates spring/fall double-cropping |
| `yieldPerSqFt` | `number` | ▸ Pounds per square foot per season, used for the ranking |
| `yieldNote` | `string \| null` | e.g. `"~8 lb per plant"` |
| `whyStrategic` | `string` | ▸ The "Why:" line shown on screen 2 |
| `containerFriendly` | `boolean` | ▸ Drives the GOOD FOR CONTAINER tag |
| `cautionTag` | `string \| null` | ▸ Short uppercase warning, e.g. `"DON'T OVERPLANT"` |
| `descriptorTags` | `string[]` | ▸ Neutral chips: `DETERMINATE`, `CUT & COME AGAIN`, `SPRING + FALL` |
| `sowNote` | `string \| null` | Authored parenthetical after the sow date, e.g. `"2 wks after frost"` |
| `timingTail` | `string \| null` | Authored tail of the timing line; falls back to `yieldNote` |
| `spacingInches` | `number` | Screen 3 display only |
| `rowSpacingInches` | `number` | Screen 3 display only |
| `plantsPerSqFt` | `number` | ▸ How many plants fit one 12" cell. Drives the bed-space estimate |
| `depthInches` | `number` | Screen 3 |
| `sunNeeds` | `"full" \| "partial" \| "shade-tolerant"` | Screen 3 |
| `soilMix` | `string` | One sentence, screen 3 |
| `quantityUnit` | `"row_feet" \| "plants"` | Which label the quantity field shows |
| `minZone` / `maxZone` | `string` | Zone range this crop is recommended in |

### PlanCrop

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | uuid |
| `cropId` | `string \| null` | Null when `isCustom` |
| `isCustom` | `boolean` | |
| `customName` | `string \| null` | Required when `isCustom` |
| `customDaysToMaturity` | `number \| null` | Optional when `isCustom` |
| `customSowMethod` | `"direct" \| "transplant" \| null` | Optional when `isCustom` |
| `customWhy` | `string \| null` | Generated "Why:" line (Phase 4). Null until — or unless — it lands |
| `quantity` | `number \| null` | Row feet or plant count; null means 1 |
| `selected` | `boolean` | Checkbox state on screen 2 |
| `addedAt` | `string` (ISO datetime) | |

### CompanionPair (built-in catalog, read-only)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `cropAId` | `string` | |
| `cropBId` | `string` | |
| `relationship` | `"companion" \| "antagonist"` | |
| `reason` | `string` | One sentence, e.g. "Beans fix nitrogen the brassica uses" |

### LogEntry

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | uuid |
| `planCropId` | `string \| null` | Link back to the plan when the crop came from it |
| `cropName` | `string` | Denormalized so log entries survive plan edits |
| `locationType` | `"container" \| "ground"` | |
| `locationDetail` | `string \| null` | Bed name, or container size, e.g. `"15 gal"` / `"Bed 2, north end"` |
| `sunExposure` | `"full" \| "partial" \| "shade"` | |
| `datePlanted` | `string` (ISO date) | |
| `note` | `string \| null` | Free text, one line |
| `createdAt` | `string` (ISO datetime) | |

### Derived logic (not stored)

- **Recommendation ranking:** filter the catalog to crops whose `[minZone, maxZone]` contains the location's zone and whose `daysToMaturity` fits `frostFreeDays`; sort by `yieldPerSqFt` descending; take the top 5. The three sort options on screen 2 re-sort the same five: yield per sq ft, earliest sow date (`sowOffsetDays` ascending), least maintenance (`successionIntervalDays` null first).
- **Dates:** every planting date on screens 2 and 3 is `effectiveLastFrost + sowOffsetDays`, plus the second date from `fallSowOffsetDays` where a crop has one. Nothing else does date math. Dates are parsed as UTC so a browser's timezone can never shift a planting day.
- **Bed space estimate:** every bed is modelled as 12-inch square cells. Row-feet crops cost one cell per row foot; plant-count crops cost `ceil(quantity ÷ plantsPerSqFt)`. The total is rounded and displayed read-only. `spacingInches`/`rowSpacingInches` are shown on screen 3 but take no part in this figure. A plot-size calculator is explicitly out of scope for V1.
- **Plan year:** `year` is derived, not stored as a constant — once this year's last frost has passed you are planning next spring, so `year = today > thisYear's last frost ? currentYear + 1 : currentYear`. Frost dates live in `data/zones.ts` as `MM-DD` and are materialised into the plan year.

---

## 4. Design specs

### 4.1 Shared design system

**Typography.** One family: `"Helvetica Neue", Helvetica, Arial, sans-serif` for everything, plus `ui-monospace, "SF Mono", Menlo, monospace` used **only** for uppercase tags, step counters, and small meta labels. No display font, no second family.

| Role | Size / weight |
|---|---|
| Screen title (desktop) | 22px / 600 |
| Section heading | 17px / 600 |
| Card title | 16px / 600 (desktop), 15px / 600 (mobile) |
| App bar title | 16px / 600 |
| Body | 14px / 400, line-height 1.55 |
| Card meta + secondary | 13px / 400, line-height 1.5 (12px on mobile) |
| Field label | 13px / 600 |
| Helper text under field | 12px / 400 |
| Mono tag | 11px (10px mobile), letter-spacing normal, uppercase |
| Mobile inputs | **16px minimum** (prevents iOS zoom on focus) |

**Color palette — exact hex values as built.** Two muted inks were darkened after the fact to clear the WCAG AA 4.5:1 floor for text under 18px; `Ink disabled` is left as specified, since disabled text is exempt and darkening it would read as enabled.

| Token | Hex | Where |
|---|---|---|
| Canvas | `#f4f4f1` | Page background outside the app frame |
| Surface | `#ffffff` | Cards, app frame, inputs |
| Surface subtle | `#fcfcfa` | Form panel fill, bottom bar |
| Surface subtle 2 | `#fbfbf9` | Empty-state panel |
| Surface neutral strip | `#faf9f6` | Context strip when no zone is set |
| Surface disabled | `#f4f4f1` | Disabled/readonly input fill |
| Button disabled fill | `#f1f1ec` | Disabled primary button |
| Skeleton block | `#f7f7f4` fill, bars `#e6e6e0` and `#ececE6` | Loading state |
| Ink | `#1b1c1a` | Headings, primary text |
| Ink body | `#4d4f4a` | Card meta, body |
| Ink body 2 | `#5a5c56` | Paragraph copy |
| Ink muted | `#6a6c66` | "Why" lines, field labels secondary |
| Ink muted 2 | `#71736d` | Annotations, tertiary. Darkened from `#7a7c76`, which measured 4.22:1 on white |
| Ink muted 3 | `#73756e` | Step nav inactive, units. Darkened from `#8a8c85`, which measured 3.40:1 |
| Ink disabled | `#a3a59e` | Disabled labels and placeholder |
| Border strong | `#d9d9d4` | App frame border |
| Border | `#e2e2dc` | Panels, unselected cards |
| Border light | `#e6e6e1` | Header/footer dividers |
| Border lighter | `#ececE6` | List row dividers, skeleton borders |
| Border dashed | `#cfcfc8` | Dashed empty-state and add-crop borders; also input border |
| **Green accent** | `#2f6b45` | Primary buttons, links, checkboxes, active step, override border |
| Green accent hover | `#255637` | Primary button hover |
| Link hover | `#1f4a2f` | |
| Green border | `#bcd3c3` | Selected crop card border, yield tag border |
| Green tint fill | `#f2f7f3` | Context strip when zone is set, yield tag, info box |
| Green tint border | `#dfe9e2` | Context strip / info box border |
| Green tint ink | `#3c4a41` | Text on green tint |
| Green card divider | `#e6efe9` | Divider inside a selected card (mobile) |
| Selected card fill | `#fcfdfc` | Selected crop card background |
| Container tag ink / border / fill | `#4a5c8a` / `#ccd4e6` / `#f4f6fb` | GOOD FOR CONTAINER tag — the only non-green hue in the UI |
| Caution tag ink / border / fill | `#8a6a2f` / `#e6dcc2` / `#faf6ec` | DON'T OVERPLANT tag |
| Error ink | `#8a3b2f` | Field error text, error border |
| Error heading | `#7a3227` | Error panel heading |
| Error border / fill | `#e6cfc9` / `#fdf6f4` | Error panel |

Single accent rule: green `#2f6b45` is the only accent. The blue container tag and amber caution tag are informational chips, not accents — never use them for buttons or links.

**Spacing and shape.**

- Desktop app frame: `1180px` wide, `1px solid #d9d9d4`, radius `6px`, `overflow: hidden`.
- Desktop content padding: `24px`; form screens center a `640px` column inside `40px 24px 48px`.
- Desktop two-column layout: CSS grid `minmax(0,1fr) 320px`, divider = `1px solid #e6e6e1` on the left column's right edge.
- Mobile frame: `390px` wide, radius `14px`, gutters `16px`, sections separated by `1px solid #e6e6e1`.
- Vertical rhythm: gaps of `6px` (label→field), `10–12px` (list items), `16px` (card groups), `20–24px` (form sections).
- Radii: inputs and buttons `5px` desktop / `6px` mobile; cards `6px` desktop / `8px` mobile.
- Buttons: desktop `padding: 9–12px 16–18px`, font 14px/600; mobile full-width `padding: 14px 16px`, font 15px/600. Primary = green fill + white text; secondary = white fill, `#c8cec9` border, green text, hover border green.
- Inputs: `1px solid #cfcfc8`, white fill, `padding: 11px 12px` desktop, `13px 12px` mobile. Readonly/disabled: `#e6e6e1` border, `#f4f4f1` fill, `#a3a59e` text.
- Checkboxes: `17px` desktop, `20px` mobile, `accent-color: #2f6b45`. Mobile tap rows are ≥44px tall.
- No shadows anywhere. No gradients except the diagonal hatch placeholder (`repeating-linear-gradient(135deg, #fafaf7 0 8px, #f4f4f0 8px 16px)`) used for disabled list placeholders.

**App shell (every screen).** A header bar (`16px 24px`, bottom border `#e6e6e1`) with the plan name "Season Plan 2027" on the left and a five-item step nav on the right at 13px: inactive `#73756e`, current `#1b1c1a` at 600, completed green `#2f6b45` with a `✓`. Steps read `1 · Zone`, `2 · Crops`, `3 · Plan`, `4 · Companions`, `5 · Log`. On mobile the header collapses to a two-line block: mono `STEP n OF 5` at 11px above a 17px/600 title, **followed by the same five-item step nav as a horizontally scrollable row**. Without it the phone layout had no way back to a finished step, only Continue — see §7. The screen title is the page's single `h1`: visible in the mobile header, `sr-only` on desktop, where the descriptive heading sits in the content area instead.

Below the header on screens 2–5 sits a **context strip** (`12px 24px`) showing zone, frost dates, and frost-free days with an `Edit` link right-aligned. Populated: fill `#f2f7f3`, border-bottom `#dfe9e2`, text `#3c4a41`, `|` separators `#c9d6cd`. Not yet set: fill `#faf9f6`, border-bottom `#e6e6e1`, text `#71736d`, and the link reads `Set zone & frost date`.

---

### 4.2 Screen 1 — Zone & Frost Setup (`/setup`)

Screenshots: `screenshots/screen1-zone-desktop-empty.png` (empty), `screenshots/screen1-zone-desktop-normal.png` (resolved), `screenshots/screen1-zone-desktop-error.png` (invalid zip), `screenshots/screen1-zone-mobile-normal.png` (mobile).

**Layout.** App shell header, no context strip. A centered `640px` column: title `Where are you growing?` (22px/600) with a one-paragraph explanation that all planting dates derive from these two values. Below it one panel (`1px solid #e2e2dc`, radius 6, `#fcfcfa` fill, `24px` padding) containing, top to bottom: the zip field (`180px` wide), a `1px #ececE6` divider, then a two-column grid (`1fr 1fr`, `20px` gap) with **Hardiness zone** and **Average last frost date**. Primary button `Continue to Crop Recommendations` sits below the panel, left-aligned.

**Components.** Three fields only: `<input type="text">` (zip), `<input type="text" readonly>` (zone), `<input type="date">` (frost date). One primary button. No secondary actions.

**States.**

- *Empty* — zone and frost fields are rendered **disabled, not hidden**, so the form never shifts height. Helper text: "Filled in from your zip." / "Editable once your zip resolves." Continue is disabled (`#f1f1ec` fill, `#a3a59e` text, `not-allowed`).
- *Resolved* — zip helper turns green with the city name. Zone shows `6b`, readonly, helper "USDA 2023 map · not editable". Frost date is fully editable; **when the user changes it the input border turns green `#2f6b45`** and the helper reads "Edited — zip average was Apr 22." with a `Reset to average` link. A green info box below the grid shows first frost and frost-free days: "First frost **Oct 21** · **176 frost-free days** — enough for two successions of most fast crops." Continue is enabled.
- *Invalid zip* — the field border turns `#8a3b2f`, helper text turns `#8a3b2f` and reads "We don't recognize that zip code. Check the digits, or [pick your zone manually]." Zone and frost stay disabled and empty. **Inline field error only — no modal, no toast.** The manual link swaps the zone readonly input for a `<select>` of zones 3a–11b and makes the frost date required.

**Behavior.** Lookup fires on blur or on the 5th digit — there is no separate "Look up" button. Zone is never user-editable except through the manual fallback. Frost date is the only editable derived field, because experienced gardeners know their own microclimate.

---

### 4.3 Screen 2 — Crop Recommendations (`/crops`) — main screen

Screenshots: `screenshots/screen2-crops-desktop-empty.png` (empty), `screenshots/screen2-crops-desktop-normal.png` (populated), `screenshots/screen2-crops-desktop-loading.png` (loading), `screenshots/screen2-crops-desktop-error.png` (load failure), `screenshots/screen2-crops-mobile-normal.png` (mobile populated).

**Desktop layout.** App shell header, populated context strip, then a two-column grid `minmax(0,1fr) 320px`.

*Left column (`24px` padding):* a header row with section heading "Recommended for a higher-yield 6b season" plus subline "5 crops, ranked by usable yield per square foot within your frost window." On the right of that row, a `Show why each crop` checkbox followed by a `Sort by` `<select>` (`min-width: 180px`) with three options. Below, a vertical list of five crop cards (`10px` gap). Below the list, a dashed-border row (`1px dashed #cfcfc8`, radius 6, `16px 18px`) for **Add a custom crop**: a name text input (`230px`), a days-to-maturity number input (`150px`), a `<select>` for Direct sow / Transplant, and an `Add` secondary button.

*Crop card.* Grid `24px minmax(0,1fr) 150px`, `14px` gap, `16px 18px` padding. Column 1: checkbox. Column 2: title row (16px/600 name, then mono tags that wrap), a 13px timing line ("Direct sow Apr 29 – Jun 10 · 50 days to pick · 3 successions fit your season"), and — when "Show why" is on — a 13px `#6a6c66` "Why:" line. Column 3: a labelled number input, `Row feet` or `Plants` per the crop's `quantityUnit`.

Selected cards: border `#bcd3c3`, fill `#fcfdfc`. Unselected: border `#e2e2dc`, fill `#ffffff`, and the quantity input is muted (`#e2e2dc` border, `#fafaf7` fill, `—` placeholder) and **disabled until the checkbox is checked**. Blank quantity = 1.

Tags, in card order: `HIGHEST YIELD / SQ FT` (green), then neutral descriptors (`DETERMINATE`, `CUT & COME AGAIN`, `SPRING + FALL`), then `GOOD FOR CONTAINER` (blue, any crop with `containerFriendly`), then the amber `DON'T OVERPLANT` caution. The yield badge marks the highest-yield **crop**, not the first slot — §3 defines the ranking as yield and the sort options as re-ordering that same five, so the badge travels with the crop when another sort moves it down the list.

*Right column (`320px`, `24px` padding):* heading "Selected crops (3)", then a `<ul>` of selected crops — each row `10px 0`, bottom border `#ececE6`, showing name plus a muted quantity and a small underlined text-button `Remove`. Below: "Estimated bed space: **26 sq ft**" (read-only — 12 row feet of beans, 6 tomato plants and 8 kale plants under the 12-inch-cell model in §3). Then the full-width primary `Continue to Planting Plan`, then a 12px `#73756e` reassurance line "You can add or drop crops later without losing your plan."

**Mobile layout (390px).** Same content, one column: two-line header, context strip condensed to "**Zone 6b** · frost Apr 28 · 176 days" plus `Edit`. Then the count line, the `Show why each crop` checkbox as a full tap row, the sort `<select>` full width, then cards. In a card the checkbox and text sit in a `12px`-gap row; tags wrap to their own line; the quantity field moves **below** the text as its own labelled row separated by a `1px #e6efe9` divider, input `96px` wide. The right rail becomes a **sticky bottom bar** (`#fcfcfa`, top border `#e6e6e1`): "**3 crops selected**" left, "26 sq ft" right, full-width Continue beneath. The add-custom-crop row collapses to a single dashed full-width button `+ Add a custom crop` that opens the same three fields.

**States.**

- *Empty (no zone yet)* — neutral context strip. A dashed panel: "No recommendations yet" (18px/600) + "Enter a zip code on the Zone & Frost Setup step. We rank crops by yield per square foot against your frost-free window." with primary `Set zone & frost date` and secondary `+ Add a custom crop`. Below, three hatch-filled `76px` placeholder rows under a mono label. Right rail shows "Selected crops (0)", a one-line explanation ("Nothing selected. Pick 3–6 crops for a first season plan."), and a disabled Continue. Custom crop stays available with no zone — it just skips the timing calculation.
- *Loading (right after zip entry)* — populated context strip, "Finding crops for zone 6b…" then three `92px` skeleton cards with two or three grey bars each. **Static skeletons — no spinner, no animation.** Right rail shows "Selected crops (0)" greyed and a disabled Continue.
- *Load failure* — the left column is replaced by one error panel (`#fdf6f4` fill, `#e6cfc9` border, radius 6, `20px`): heading "We couldn't load recommendations" in `#7a3227`, body "Your zone (6b) and frost date are saved. Nothing else is lost.", then primary `Try again` and secondary `+ Add crops manually`. Invalid-zip errors belong on screen 1, not here.

**Behavior.** "Show why" defaults **off** on both breakpoints — the card is dense enough without it — and toggles all five why-lines at once. The toggle's state persists per user. Nothing else on this screen does date math beyond `effectiveLastFrost + sowOffsetDays`. Adding a custom crop appends a row to the same list, tagged `CUSTOM`, with no timing badge.

---

### 4.4 Screens 3–5 — built to spec, never wireframed

**These three screens have no approved wireframe.** They were built on the shell and vocabulary above (same header, same context strip, same card and field styling, same green accent) from the layouts below. No new component types were introduced.

**Screen 3 — Planting Plan (`/plan`).** One card per selected crop **in sowing order, earliest first** — the page reads as a schedule rather than as the order crops happened to be ticked; custom crops carry no offset so they sort last, oldest first. Single column, `1180px`/`640px`-ish content, `12px` gaps. Card header: crop name (16px/600) plus its tags. Card body: a plain definition list in a two- or three-column grid at 13px — **Sow** (`direct sow Apr 29` / `transplant May 6`), **Days to maturity**, **Spacing** (`4 in apart, rows 18 in`), **Depth** (`1 in`), **Sun** (`full — 6+ hrs`), **Soil mix** (one sentence). Labels `#6a6c66`, values `#1b1c1a`. Empty state: dashed panel "No crops selected yet" + primary button back to `/crops`. No error state needed — all data is local. A `Print plan` secondary button sits beside the subtitle; see §5 Phase 4 for what printing drops.

**Screen 4 — Companion Planting (`/companions`).** One card per selected crop. Inside each card two lists: **Plant with** (green check-free rows: companion crop name + reason, 13px) and **Keep apart from** (rows with the reason, ink `#8a3b2f` for the crop name only). Only pairs where **both** crops are in the plan, plus companions the gardener has not selected shown as a muted third list "Worth adding" with an `Add to plan` text button. Empty state: dashed panel pointing back to `/crops`.

**Screen 5 — My Garden Log (`/log`).** A primary `+ Add log entry` button (full-width on mobile, below the subtitle), then a list of entries newest first — each row a card (`16px 18px`) with crop name (15px/600) on the left, and `container · 15 gal` / `ground · Bed 2` plus `full sun` as mono-free 13px meta, date right-aligned in `#73756e`. The add form is an inline panel (same panel styling as screen 1) with: crop `<select>` (selected plan crops + "Something else" → text input), location type radio (Container / In-ground), a detail text input, sun exposure `<select>` (Full / Partial / Shade), `<input type="date">`, and a one-line note. Each row carries `Edit` and `Delete` text buttons; Edit reopens the same inline panel pre-filled, retitled "Edit log entry" with a `Save changes` button, and updates in place. An entry whose crop has since left the plan falls back to "Something else" with the stored `cropName` preserved, so re-saving cannot blank it. Empty state: dashed panel "Nothing logged yet — log what you plant as you plant it."

---

## 5. Build phases

All four phases are complete. Each phase's **Verify in the browser** list was
walked step by step and passed, with one exception noted at Phase 4.

Built alongside the phases, not in the original plan: a Vitest suite (49 tests
over the derivation logic, catalog integrity and schema migration — see
`docs/testing.md`), a forward-migration path in `lib/store.ts` that backs up
rather than discards data it cannot read, `app/error.tsx` and `app/not-found.tsx`
boundaries, and the backward navigation described in §7.

### Phase 1 — Skeleton: screens, navigation, data model (no lookups, no AI) ✓

- Scaffold with `create-next-app` (TypeScript, Tailwind, App Router).
- Implement `lib/types.ts` exactly as §3, plus `lib/store.ts` reading/writing `localStorage` key `sowline.v1` with in-memory fallback for SSR.
- Seed `data/crops.ts` (≥24 crops, all fields populated) and `data/companions.ts`.
- Build the app shell: header, step nav, context strip, responsive at 390px and 1180px, exact colors from §4.1.
- Build all five routes with **hard-coded sample data** matching the screenshots (zip 47404, zone 6b, last frost Apr 22 with an Apr 28 override, bush beans / paste tomato / lacinato kale selected).
- Every state from §4 rendered and reachable: empty, populated, loading, error. A temporary `?state=empty|loading|error` query param on `/crops` and `/setup` is acceptable for review.
- Selection, quantity entry, remove, and "Show why" all work against local state.

**Verify in the browser**

1. Every one of the five steps in the top nav opens a page that looks like its screenshot, with no blank pages and no error messages.
2. On the Crops page, checking and unchecking crops changes the "Selected crops" count on the right, and the quantity box only accepts typing when the crop is checked.
3. "Show why each crop" starts off; turning it on adds a "Why:" line to every crop and turning it off removes them.
4. Shrinking the browser window to phone width switches the Crops page to one column with the green Continue button pinned at the bottom.
5. Adding `?state=empty` to the Crops page address shows the "No recommendations yet" panel, and `?state=loading` shows the grey skeleton cards.

### Phase 2 — Real data flow: zone resolution from a bundled dataset, derived dates, persistence ✓

- Bundle a static zip→zone→frost-date dataset (`data/zones.ts`, keyed by zip prefix is acceptable for V1) and wire the lookup on blur / 5th digit, with a 400–800ms simulated delay so the loading state is real.
- Implement `effectiveLastFrost`, `frostFreeDays`, the override + reset behavior with the green border treatment, and the manual zone `<select>` fallback.
- Implement recommendation filtering and ranking per §3, all three sort options, and the bed-space estimate.
- Implement the custom crop add, the invalid-zip error, and the recommendations failure panel with a working `Try again`.
- Persist everything through `lib/store.ts` and drop all hard-coded sample data and the `?state=` param.

**Verify in the browser**

1. Typing `47404` fills in zone `6b` and a last frost date by itself, and briefly shows the grey loading cards on the Crops page.
2. Typing `99999` shows the red "We don't recognize that zip code" message under the field, and the zone and frost boxes stay empty and greyed out.
3. Changing the frost date by a week changes the sow dates listed on the crop cards, and a "Reset to average" link appears next to the date.
4. Entering a zip for a much colder place (e.g. `55401`, Minneapolis) gives a different set of five crops than `47404` does.
5. Reloading the page keeps your zip code, frost date, and selected crops exactly as you left them.

### Phase 3 — Downstream screens: Planting Plan, Companions, Garden Log ✓

- Build screens 3, 4, and 5 per §4.4 against the real plan data.
- Companion matching from `data/companions.ts`, restricted to selected crops, with the "Worth adding" list wired to add a crop to the plan.
- Log entry create, edit, and delete; entries survive plan changes via the denormalized `cropName`.
- Full-flow navigation: Continue moves forward, the context strip `Edit` link returns to `/setup` without losing the plan.

**Verify in the browser**

1. The Planting Plan page shows one card per crop you checked, each listing sow date, spacing, depth, sun, and soil.
2. Unchecking a crop back on the Crops page removes its card from the Planting Plan.
3. The Companion Planting page only mentions crops you actually selected, and each pairing gives a reason in plain words.
4. You can add a log entry for a crop, choose container or in-ground and a sun level, and see it appear at the top of the log with today's date.
5. Deleting a crop from your plan does not delete or blank out the log entry you already wrote for it.

### Phase 4 — Integrations and generated content (last) ✓

- **Live zone lookup, done.** `/api/zone` resolves the USDA zone from `phzmapi.org` and the city from `api.zippopotam.us`, server-side to avoid CORS. Neither needs a key. Fallback is layered: either upstream may fail independently; an unknown zip falls back to `data/zones.ts` server-side; and if the route itself is unreachable the client falls back again locally, so a lookup still works with the network down. Error copy is unchanged.
  - **Frost dates are still derived from the zone.** No free frost-date service exists, so the live lookup contributes zone and city only. A zip present in the bundled table keeps its local frost dates, which are more specific than the zone-wide averages in `ZONE_DEFAULTS`.
- **Optional AI assist, done for the why-line.** `/api/enrich` generates the "Why:" line for a custom crop in the catalog's voice, using `claude-opus-5` at `effort: "low"` (~120 input + ~100 output tokens, ~3s, well under 1¢ per crop). A plain `Generating…` line shows while it runs. Every failure path — no `ANTHROPIC_API_KEY`, refusal, bad input, timeout, runaway or empty output — returns HTTP 200 with `why: null`, so the card simply carries no why-line and the crop stays usable. Failures are logged server-side; the client never sees a reason.
  - The crop name is untrusted input: length-capped and fenced as data, with the system prompt as the only source of instructions.
  - **Companion `reason` text for custom crops was not built.** Custom crops do not participate in companion pairings at all, so there is nothing to caption.
  - Requires `ANTHROPIC_API_KEY` in `.env.local`; see `.env.example`. Absent it, the app behaves exactly as it did before Phase 4.
- **Print export, done.** A `Print plan` button on `/plan` calls `window.print()`. An `@media print` block drops both headers, the step actions, the Print button itself and the context strip's `Edit` link, flattens the app frame, and marks each crop card `break-inside: avoid`. The strip's zone and frost figures are kept — they are worth having on paper. No PDF library.

**Verify in the browser**

1. A zip code that was not in the built-in list (try a rural one) now resolves to a zone instead of showing the red error. — **Pass:** `59718` → Bozeman, MT / 5a; `04578` → Wiscasset, ME / 5b.
2. Turning off your internet connection still lets the app resolve a common zip code and shows no crash. — **Pass:** with every request failing, `47404` still resolved from the bundled dataset.
3. Adding a custom crop produces a "Why:" line in the same style as the built-in crops, and the app keeps working if it fails to produce one. — **Pass:** verified against a live key; a forced failure leaves the crop usable with no why-line.
4. Printing the Planting Plan page produces a clean page with every selected crop's specs and no navigation chrome. — **Pass.**

---

## 6. Out of scope for V1

| Left out | Why |
|---|---|
| Accounts, login, multi-user | One gardener, one browser; local storage is enough to prove the planning value. |
| Marketing or landing pages | Nothing to market until the flow works. |
| Settings and preferences screens | The only real preference (frost date) is edited in place on screen 1. |
| Billing, plans, payments | No pricing decision has been made. |
| Notifications, reminders, to-do lists | Reminders are a retention feature; V1 has to be worth returning to first. |
| Indoor seed-starting instructions | A separate depth of content (lights, hardening off) that would double the crop dataset. |
| Harvest yield tracking and preservation | V1 promises a better plan, not a record of results; tracking needs a whole season of data to be useful. |
| Spreadsheet/CSV import of existing plans and external guides | Import is a migration feature for users who already track carefully — the opposite of the target gardener. |
| Garden bed layout, maps, drag-and-drop plot design | A large custom UI surface; the bed-space number covers the "will it fit" question for now. |
| Weather feeds, live frost alerts, microclimate data | Depends on an integration and a notification channel we are not building. |
| Pest and disease diagnosis, photo upload | Different product. |
| Crop rotation history across years | Requires more than one season of data to mean anything. |
| Sharing, collaboration, public plan links | No accounts, so no owner to share as. |
| Native mobile apps | The responsive web layout at 390px covers phone use. |

---

## 7. As-built deviations

Every place the shipped app differs from the original spec, and why. Ordered by
how much each one changes the product.

### Bed space uses 12-inch cells, not spacing areas

**Spec:** `sum(quantity × spacing area from the catalog)`, with the screen-2
screenshot reading **34 sq ft**.

**Built:** row feet cost one cell each; plant counts cost
`ceil(quantity ÷ plantsPerSqFt)`. The same three crops now total **26 sq ft**.

**Why:** the spacing-area reading could not be made to produce 34 from any set
of defensible spacing values — a row-area calculation puts those three crops at
54 sq ft. The product owner chose the simpler model: "all recommendations should
be based on a 12\" sq ft plot. Keep it simple." This is the one place the built
screen knowingly contradicts an approved screenshot.

**Open:** asking the gardener for their available square footage and filtering
recommendations to what fits was raised during user testing and deferred. The
cheap half (ask, filter, show space remaining) is roughly half a day; replacing
yield as the *ranking* criterion is several days, because all 29 `whyStrategic`
lines, the yield badge, a sort option and nine tests are written around it.

### Two palette inks darkened for contrast

`Ink muted 2` `#7a7c76` → `#71736d` (4.22:1 → 4.80:1) and `Ink muted 3`
`#8a8c85` → `#73756e` (3.40:1 → 4.67:1), both on white. §4.1's originals fell
below the WCAG AA 4.5:1 floor for text under 18px, and `#8a8c85` carried the
step navigation. Each was darkened only as far as its real backgrounds require,
so the palette's tonal ladder survives. `Ink disabled` is unchanged — disabled
text is exempt, and darkening it would read as enabled.

### Schema version 2

`PlanCrop.customWhy` (Phase 4) required a schema bump. `lib/store.ts` carries a
migration registry keyed by the version each step upgrades *from*; v1 data walks
forward automatically. Data it cannot read — a corrupt blob, or one written by a
newer build — is copied to a timestamped backup key and left intact rather than
discarded. There is no server copy, so silently dropping a season would be
unrecoverable.

### Navigation added after user testing

The collapsed mobile header originally dropped the step nav, leaving the phone
layout no way back to a finished step. The nav is now kept as a scrollable row,
and every `Continue` is paired with a `Back`.

### Smaller decisions

- **Changing zip clears crop selections only when the zone changes.** A
  different zip in the same zone keeps them; a new zone means a different
  recommended five, so the old picks no longer apply.
- **Recommended crops get no stored row until first picked**, keeping the saved
  plan exactly as large as the real selection.
- **A selected crop that drops out of the recommended five stays on screen**
  below them. Shrinking the season with a frost override can do this, and a crop
  that is counted in the rail but invisible in the list is worse than a sixth card.
- **Beets carry `GOOD FOR CONTAINER`.** The mobile frame showed the tag and the
  desktop frame did not; horticulture agrees with mobile (12" depth, 2–3"
  thinning), so the desktop frame was treated as the one in error.
- **The mobile "2 more crops below" line was dropped** and all five cards render.
  It was artboard trimming, not a pattern worth shipping.
- **Section headings are hidden on mobile for screens 3–5**, where the collapsed
  header already names the screen.
- **Crop data is plausible rather than sourced.** Values were compiled from
  extension guides and square-foot-gardening charts, then tuned so zone 6b
  reproduces the approved screenshots and a cold zone differs. A pass to
  cross-check every field against primary sources has not been done.
- **Custom crops still show "Not in the catalog yet"** for spacing and depth on
  screen 3. Phase 4's AI assist covers the why-line only, per §5.
