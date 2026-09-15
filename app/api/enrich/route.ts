// Generates the "Why:" line for a custom crop the catalog does not cover
// (PRD §5 Phase 4). Strictly additive and skippable: every failure path
// returns 200 with `why: null` so the caller simply shows no why-line.
//
// Server-side because the API key must never reach the browser.
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export interface EnrichResponse {
  why: string | null;
  /** Why nothing was generated, for logs and the unconfigured case. */
  reason?: "not_configured" | "failed" | "invalid_input";
}

const MODEL = "claude-opus-5";

/**
 * The catalog's own why-lines are the style target: one sentence tying the
 * crop to yield or season length, never "easy" or "popular".
 */
const SYSTEM = `You write one-sentence strategic notes for a vegetable garden planner.

The gardener has two or more seasons of experience and plans loosely. Every note must
tie the crop to usable yield per square foot or to season length — never to a crop being
"easy", "popular", or "beginner-friendly".

Rules:
- Exactly one sentence, 15-35 words.
- Plain words. No marketing tone, no exclamation marks, no emoji.
- Be specific to the crop named. If you do not know the crop, say what its growth habit
  implies for bed space or timing rather than inventing figures.
- Do not state precise yields or days-to-maturity you are not confident in.
- Return the sentence only — no preamble, no quotes.

Examples of the target voice:
"Fastest turnaround of anything in your window — three sowings two weeks apart keep one bed picking from July to frost."
"Enormous yield per plant, which is exactly why two is a plan and four is a problem — one plant feeds a household."`;

export async function POST(request: Request) {
  // The feature is optional by design: with no key configured the app behaves
  // exactly as it did before Phase 4.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ why: null, reason: "not_configured" } satisfies EnrichResponse);
  }

  let cropName = "";
  let daysToMaturity: number | null = null;
  let sowMethod: string | null = null;
  try {
    const body = (await request.json()) as {
      cropName?: unknown;
      daysToMaturity?: unknown;
      sowMethod?: unknown;
    };
    if (typeof body.cropName !== "string" || !body.cropName.trim()) {
      return NextResponse.json({ why: null, reason: "invalid_input" } satisfies EnrichResponse);
    }
    // Cap the length: this string is gardener-supplied and goes into a prompt.
    cropName = body.cropName.trim().slice(0, 60);
    daysToMaturity = typeof body.daysToMaturity === "number" ? body.daysToMaturity : null;
    sowMethod = body.sowMethod === "transplant" || body.sowMethod === "direct" ? body.sowMethod : null;
  } catch {
    return NextResponse.json({ why: null, reason: "invalid_input" } satisfies EnrichResponse);
  }

  const facts = [
    `Crop: ${cropName}`,
    daysToMaturity ? `Days to maturity: ${daysToMaturity}` : null,
    sowMethod ? `Sown by: ${sowMethod}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      // Opus 5 runs adaptive thinking by default, so max_tokens has to cover
      // the reasoning as well as the answer. A 200-token budget was consumed
      // entirely by thinking and returned no text at all. Low effort suits a
      // one-sentence task and keeps this to ~45 thinking tokens.
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: SYSTEM,
      // The crop name is untrusted input, so it is fenced as data and the
      // system prompt above is the only source of instructions.
      messages: [
        {
          role: "user",
          content: `Write the strategic note for this crop.\n\n<crop>\n${facts}\n</crop>`,
        },
      ],
    });

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      console.error(`[enrich] no usable output: stop_reason=${response.stop_reason}`);
      return NextResponse.json({ why: null, reason: "failed" } satisfies EnrichResponse);
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();

    // Guard against an empty or runaway response reaching the card.
    if (!text || text.length > 400) {
      console.error(`[enrich] rejected output of length ${text.length}`);
      return NextResponse.json({ why: null, reason: "failed" } satisfies EnrichResponse);
    }
    return NextResponse.json({ why: text } satisfies EnrichResponse);
  } catch (error) {
    // The client only ever sees why: null, so this is the sole record of what
    // went wrong. Log the shape, never the request — the key lives in the
    // client's headers and must not reach the logs.
    const detail =
      error instanceof Anthropic.APIError
        ? `${error.constructor.name} status=${error.status} ${error.message}`
        : String(error);
    console.error("[enrich] generation failed:", detail);
    return NextResponse.json({ why: null, reason: "failed" } satisfies EnrichResponse);
  }
}
