// Live zip -> zone lookup, with the bundled dataset as the offline fallback
// (PRD §5 Phase 4). Running it server-side avoids CORS and keeps the upstream
// hosts out of the browser's network surface.
import { NextResponse } from "next/server";
import { ZONES_BY_PREFIX } from "@/data/zones";

const UPSTREAM_TIMEOUT_MS = 4000;

export interface ZoneResponse {
  zipCode: string;
  city: string;
  hardinessZone: string;
  /** Which path answered — surfaced so the UI and tests can tell them apart. */
  source: "live" | "bundled";
}

async function withTimeout(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
  } catch {
    // Offline, DNS failure, or too slow — the caller falls back.
    return null;
  }
}

/** USDA hardiness zone for a zip. */
async function fetchZone(zip: string): Promise<string | null> {
  const res = await withTimeout(`https://phzmapi.org/${zip}.json`);
  if (!res?.ok) return null;
  try {
    const body = (await res.json()) as { zone?: unknown };
    return typeof body.zone === "string" && /^\d+[ab]$/.test(body.zone) ? body.zone : null;
  } catch {
    return null;
  }
}

/** Display-only city name. A failure here must not fail the lookup. */
async function fetchCity(zip: string): Promise<string | null> {
  const res = await withTimeout(`https://api.zippopotam.us/us/${zip}`);
  if (!res?.ok) return null;
  try {
    const body = (await res.json()) as {
      places?: { "place name"?: string; "state abbreviation"?: string }[];
    };
    const place = body.places?.[0];
    if (!place?.["place name"]) return null;
    const state = place["state abbreviation"];
    return state ? `${place["place name"]}, ${state}` : place["place name"];
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get("zip") ?? "";
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "invalid_zip" }, { status: 400 });
  }

  const bundled = ZONES_BY_PREFIX[zip.slice(0, 3)];

  // Both upstreams are independent; a slow city lookup should not hold up the
  // zone, and either can fail without sinking the request.
  const [zone, city] = await Promise.all([fetchZone(zip), fetchCity(zip)]);

  if (zone) {
    return NextResponse.json({
      zipCode: zip,
      city: city ?? bundled?.city ?? `Zip ${zip}`,
      hardinessZone: zone,
      source: "live",
    } satisfies ZoneResponse);
  }

  if (bundled) {
    return NextResponse.json({
      zipCode: zip,
      city: bundled.city,
      hardinessZone: bundled.zone,
      source: "bundled",
    } satisfies ZoneResponse);
  }

  // Unknown to both — screen 1 shows its inline error, unchanged from Phase 2.
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
