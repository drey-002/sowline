"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button, Field, InfoBox, Panel, Select, TextInput } from "@/components/ui";
import { ALL_ZONES } from "@/data/zones";
import { daysBetween, formatMonthDay } from "@/lib/derive";
import { isWellFormedZip, locationFromZone, resolveZip } from "@/lib/lookup";
import { usePlan } from "@/lib/plan-context";
import type { Location } from "@/lib/types";

type Status = "idle" | "resolving" | "resolved" | "notFound";

export default function SetupScreen() {
  const router = useRouter();
  const { plan, applyLocation, setFrostOverride, setPendingRecommendations } = usePlan();

  // Both derive from the saved plan until the gardener types, so returning
  // via the context strip's Edit link needs no seeding effect.
  const [zipInput, setZipInput] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<Status | null>(null);
  const zip = zipInput ?? plan?.location.zipCode ?? "";
  const status: Status = statusOverride ?? (plan ? "resolved" : "idle");
  const [manual, setManual] = useState(false);
  const [manualZone, setManualZone] = useState<string>("6b");
  const [manualFrost, setManualFrost] = useState("");
  const [manualTouched, setManualTouched] = useState(false);

  // Guards a stale in-flight lookup from overwriting a newer one.
  const requestRef = useRef(0);

  const location = status === "resolved" ? (plan?.location ?? null) : null;
  const avg = location?.lastFrostAvg ?? "";
  const effective = location?.lastFrostOverride ?? avg;
  const edited = Boolean(location?.lastFrostOverride && location.lastFrostOverride !== avg);
  const frostFree = location ? daysBetween(effective, location.firstFrostAvg) : 0;

  async function runLookup(value: string) {
    const id = ++requestRef.current;
    setStatusOverride("resolving");
    try {
      const resolved = await resolveZip(value);
      if (id !== requestRef.current) return;
      applyLocation(resolved);
      setStatusOverride("resolved");
      setManual(false);
    } catch {
      if (id !== requestRef.current) return;
      setStatusOverride("notFound");
    }
  }

  // Fires on the 5th digit; onBlur covers a paste that never reaches 5 by typing.
  function onZipChange(raw: string) {
    const next = raw.replace(/\D/g, "").slice(0, 5);
    setZipInput(next);
    if (isWellFormedZip(next)) {
      void runLookup(next);
    } else {
      requestRef.current++;
      setStatusOverride("idle");
    }
  }

  function commitManual() {
    setManualTouched(true);
    if (!manualFrost) return;
    const built: Location = locationFromZone(manualZone, manualFrost, zip);
    applyLocation(built);
    setStatusOverride("resolved");
    setManual(false);
  }

  function onContinue() {
    setPendingRecommendations(true);
    router.push("/crops");
  }

  const manualFrostMissing = manual && manualTouched && !manualFrost;
  const canContinue = status === "resolved" && Boolean(location);

  return (
    <AppShell current={1}>
      <div className="mx-auto max-w-[640px] px-4 py-8 md:px-6 md:pb-12 md:pt-10">
        <h2 className="text-[20px] font-semibold text-ink md:text-[22px]">
          Where are you growing?
        </h2>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-body-2">
          Your zip code sets the hardiness zone and average last frost date. Every planting date in
          your plan is calculated from these two values.
        </p>

        <Panel className="mt-6">
          <div>
            <Field
              label="Zip code"
              htmlFor="zip"
              helperTone={status === "notFound" ? "error" : status === "resolved" ? "green" : "muted"}
              helper={
                status === "notFound" ? (
                  <>
                    We don&apos;t recognize that zip code. Check the digits, or{" "}
                    <button
                      onClick={() => setManual(true)}
                      className="cursor-pointer text-error-ink underline underline-offset-2"
                    >
                      pick your zone manually
                    </button>
                    .
                  </>
                ) : status === "resolving" ? (
                  "Looking up your zone…"
                ) : status === "resolved" && location ? (
                  location.city
                ) : (
                  "5 digits, US only for now."
                )
              }
            >
              <TextInput
                id="zip"
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 47404"
                value={zip}
                invalid={status === "notFound"}
                onChange={(e) => onZipChange(e.target.value)}
                onBlur={() => {
                  if (isWellFormedZip(zip) && status === "idle") void runLookup(zip);
                }}
                className="md:w-[180px]"
              />
            </Field>
          </div>

          <hr className="my-5 border-line-lighter" />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              label="Hardiness zone"
              htmlFor="zone"
              helperTone={manual ? "muted" : location ? "muted" : "disabled"}
              helper={
                manual
                  ? "Pick the zone you garden in."
                  : location
                    ? "USDA 2023 map · not editable"
                    : "Filled in from your zip."
              }
            >
              {manual ? (
                <Select
                  id="zone"
                  value={manualZone}
                  onChange={(e) => setManualZone(e.target.value)}
                >
                  {ALL_ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput
                  id="zone"
                  readOnly
                  value={location ? location.hardinessZone : "—"}
                  className={location ? "font-semibold text-ink" : ""}
                />
              )}
            </Field>

            <Field
              label={manual ? "Last frost date (required)" : "Average last frost date"}
              htmlFor="frost"
              helperTone={manualFrostMissing ? "error" : location || manual ? "muted" : "disabled"}
              helper={
                manualFrostMissing ? (
                  "Enter your average last frost date to continue."
                ) : manual ? (
                  "We have no zip average to fall back on, so this one is required."
                ) : edited && location ? (
                  <>
                    Edited — zip average was {formatMonthDay(avg)}.{" "}
                    <button
                      onClick={() => setFrostOverride(null)}
                      className="cursor-pointer text-accent underline underline-offset-2 hover:text-link-hover"
                    >
                      Reset to average
                    </button>
                  </>
                ) : location ? (
                  "Average for your zip. Edit it if you know your own microclimate."
                ) : (
                  "Editable once your zip resolves."
                )
              }
            >
              <TextInput
                id="frost"
                type="date"
                disabled={!location && !manual}
                invalid={manualFrostMissing}
                edited={edited}
                value={manual ? manualFrost : effective}
                onChange={(e) =>
                  manual
                    ? setManualFrost(e.target.value)
                    : setFrostOverride(e.target.value || null)
                }
              />
            </Field>
          </div>

          {manual && (
            <div className="mt-5">
              <Button variant="secondary" onClick={commitManual}>
                Use this zone
              </Button>
            </div>
          )}

          {location && !manual && (
            <div className="mt-5">
              <InfoBox>
                First frost{" "}
                <strong className="font-semibold">{formatMonthDay(location.firstFrostAvg)}</strong> ·{" "}
                <strong className="font-semibold">{frostFree} frost-free days</strong> — enough for
                two successions of most fast crops.
              </InfoBox>
            </div>
          )}
        </Panel>

        <div className="mt-6">
          <Button
            onClick={onContinue}
            disabled={!canContinue}
            className="w-full md:w-auto"
          >
            Continue to Crop Recommendations
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
