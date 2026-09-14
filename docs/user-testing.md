# Walking the app as a gardener

The point is not to check the app matches the spec — I've done that. The point is to
find out whether it's any good to *plan a garden with*. Those are different questions,
and only the second one needs you.

## Before you start

```bash
npm run dev     # then open http://localhost:3000
```

Reset to a clean slate whenever you want a fresh run: open DevTools → Console →
`localStorage.clear()` → reload. Do this before each scenario below so you meet the
app the way a new user would.

## The one rule

**Don't help the app.** You know what every button does — a real gardener doesn't.
When you catch yourself thinking "well, obviously you'd click there," write that down.
That hesitation *is* the finding.

## Four scenarios

Run each one end to end, then answer its question before moving on.

**1. Your actual garden.** Use your real zip and plan the season you'd really plant.
> Would you actually follow this plan? Where did it tell you something you didn't
> already know?

**2. The skeptical gardener.** You already know what you want to grow. Try to make the
app agree with you.
> When the app recommended against what you wanted, was it persuasive or annoying?
> Could you get your crops in anyway without fighting it?

**3. Small space.** Plan for a balcony — containers only, maybe 20 sq ft.
> Does the bed-space number mean anything to you? Did the container tags help you
> choose? (Note: bed space counts 12-inch cells, so it reads in whole squares.)

**4. Mid-season.** You're planting in July, not April.
> Do the dates still make sense, or does the app assume you're planning in winter?
> (I expect this one to be rough — tell me how rough.)

## What I want written down

For anything that snagged you, one line each:

- **Where** you were (screen + what you'd just done)
- **What you expected** to happen
- **What happened** instead
- **How much it mattered** — blocked / annoyed / just noticed

Screenshots help more than descriptions for anything visual.

## Questions I can't answer for myself

Answer these from your own use, not from the spec:

1. Is **"yield per square foot"** the right thing to sort by first? You confirmed this
   earlier from the PRD's logic — I want to know if it still feels right after you've
   actually used it to pick crops.
2. The **"Why:" line** is off by default. After turning it on, should it be?
3. The **companion screen** only shows pairings among crops you picked. Did that feel
   focused, or did it feel like it was hiding things?
4. Is the **garden log** something you'd return to, or does it feel like homework?
5. Where did you want a **"back"** that wasn't there?

## Known rough edges — don't bother reporting these

So you spend your attention on new things:

- Zip lookup only covers ~85 US metro prefixes. Unknown zips show the error and offer
  manual zone entry. Live lookup is Phase 4.
- Custom crops show "Not in the catalog yet" for spacing and depth. Filling those in
  is Phase 4's AI assist.
- No print or export yet — Phase 4.
- Crop data is plausible rather than sourced. If a specific number looks wrong to you,
  that *is* worth reporting.
- Bed space reads 26 sq ft for the three-crop example, not 34. That's the agreed
  12-inch-cell simplification, working as intended.
