"use client";

import { useState } from "react";
import { AppShell, ContextStrip } from "@/components/app-shell";
import { Button, DashedPanel, Field, Panel, Select, TextInput } from "@/components/ui";
import { StepActions } from "@/components/step-actions";
import { CROPS_BY_ID } from "@/data/crops";
import { formatMonthDay } from "@/lib/derive";
import { usePlan } from "@/lib/plan-context";
import type { LocationType, LogEntry, SunExposure } from "@/lib/types";

const SOMETHING_ELSE = "__other__";

type FormMode = { kind: "closed" } | { kind: "new" } | { kind: "edit"; entry: LogEntry };

export default function LogPage() {
  const { state, selectedCrops, addLogEntry, updateLogEntry, deleteLogEntry } = usePlan();
  const [mode, setMode] = useState<FormMode>({ kind: "closed" });
  const entries = state.log;

  const cropOptions = selectedCrops.map((pc) => ({
    id: pc.id,
    name: pc.isCustom
      ? (pc.customName ?? "Custom crop")
      : (CROPS_BY_ID.get(pc.cropId ?? "")?.name ?? "Crop"),
  }));

  return (
    <AppShell current={5} contextStrip={<ContextStrip />}>
      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="hidden text-[17px] font-semibold text-ink md:block">My garden log</h2>
            <p className="text-[13px] text-ink-body md:mt-1">
              What actually went in the ground, newest first.
            </p>
          </div>
          {mode.kind === "closed" && (
            <Button
              onClick={() => setMode({ kind: "new" })}
              fullWidth
              className="md:w-auto md:shrink-0"
            >
              + Add log entry
            </Button>
          )}
        </div>

        {mode.kind !== "closed" && (
          <div className="mt-5">
            <LogForm
              // Remounts when the target changes so the fields re-seed.
              key={mode.kind === "edit" ? mode.entry.id : "new"}
              entry={mode.kind === "edit" ? mode.entry : null}
              cropOptions={cropOptions}
              onCancel={() => setMode({ kind: "closed" })}
              onSave={(values) => {
                if (mode.kind === "edit") {
                  updateLogEntry(mode.entry.id, values);
                } else {
                  addLogEntry(values);
                }
                setMode({ kind: "closed" });
              }}
            />
          </div>
        )}

        {entries.length === 0 ? (
          <DashedPanel className="mt-5">
            <h3 className="text-[18px] font-semibold text-ink">Nothing logged yet</h3>
            <p className="mt-2 text-[14px] text-ink-body-2">
              Log what you plant as you plant it.
            </p>
          </DashedPanel>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {entries.map((e) => (
              <LogRow
                key={e.id}
                entry={e}
                onEdit={() => setMode({ kind: "edit", entry: e })}
                onDelete={() => deleteLogEntry(e.id)}
              />
            ))}
          </div>
        )}

        <StepActions backHref="/companions" backLabel="Back to Companions" />
      </div>
    </AppShell>
  );
}

function LogRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: LogEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const place = entry.locationType === "container" ? "container" : "ground";
  const meta = entry.locationDetail ? `${place} · ${entry.locationDetail}` : place;

  return (
    <div className="rounded-[8px] border border-line bg-surface p-4 md:rounded-[6px] md:px-[18px] md:py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{entry.cropName}</h3>
          <p className="mt-[2px] text-[13px] text-ink-body">
            {meta} · {entry.sunExposure} sun
          </p>
          {entry.note && <p className="mt-[6px] text-[13px] text-ink-muted">{entry.note}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-[13px] text-ink-muted-3">{formatMonthDay(entry.datePlanted)}</span>
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="cursor-pointer text-[13px] text-accent underline underline-offset-2 hover:text-link-hover"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="cursor-pointer text-[13px] text-accent underline underline-offset-2 hover:text-link-hover"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type LogValues = Omit<LogEntry, "id" | "createdAt">;

function LogForm({
  entry,
  cropOptions,
  onSave,
  onCancel,
}: {
  entry: LogEntry | null;
  cropOptions: { id: string; name: string }[];
  onSave: (values: LogValues) => void;
  onCancel: () => void;
}) {
  // An entry being edited may name a crop that has since left the plan, so the
  // select falls back to "Something else" with the stored name preserved.
  const matching = entry ? cropOptions.find((c) => c.id === entry.planCropId) : undefined;
  const [cropChoice, setCropChoice] = useState(
    entry ? (matching ? matching.id : SOMETHING_ELSE) : (cropOptions[0]?.id ?? SOMETHING_ELSE),
  );
  const [otherName, setOtherName] = useState(entry && !matching ? entry.cropName : "");
  const [locationType, setLocationType] = useState<LocationType>(entry?.locationType ?? "ground");
  const [detail, setDetail] = useState(entry?.locationDetail ?? "");
  const [sun, setSun] = useState<SunExposure>(entry?.sunExposure ?? "full");
  const [date, setDate] = useState(
    entry?.datePlanted ?? new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState(entry?.note ?? "");

  const isOther = cropChoice === SOMETHING_ELSE;
  const cropName = isOther
    ? otherName.trim()
    : (cropOptions.find((c) => c.id === cropChoice)?.name ?? "");

  function save() {
    if (!cropName) return;
    onSave({
      // Denormalized cropName is what makes an entry survive the plan changing;
      // planCropId is only the link back while the crop is still in the plan.
      planCropId: isOther ? null : cropChoice,
      cropName,
      locationType,
      locationDetail: detail.trim() || null,
      sunExposure: sun,
      datePlanted: date,
      note: note.trim() || null,
    });
  }

  return (
    <Panel>
      <h3 className="mb-4 text-[15px] font-semibold text-ink">
        {entry ? "Edit log entry" : "New log entry"}
      </h3>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Crop" htmlFor="log-crop">
          <Select id="log-crop" value={cropChoice} onChange={(e) => setCropChoice(e.target.value)}>
            {cropOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={SOMETHING_ELSE}>Something else</option>
          </Select>
        </Field>

        {isOther && (
          <Field label="Crop name" htmlFor="log-other">
            <TextInput
              id="log-other"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              placeholder="e.g. tomatillo"
            />
          </Field>
        )}

        <Field label="Where" helper="Container or straight into a bed.">
          <div className="flex gap-4 pt-1">
            {(["container", "ground"] as const).map((v) => (
              <label
                key={v}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[14px] md:min-h-0"
              >
                <input
                  type="radio"
                  name="locationType"
                  checked={locationType === v}
                  onChange={() => setLocationType(v)}
                  className="h-[17px] w-[17px]"
                />
                {v === "container" ? "Container" : "In-ground"}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Detail" htmlFor="log-detail" helper="Bed name or container size.">
          <TextInput
            id="log-detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={locationType === "container" ? "15 gal" : "Bed 2, north end"}
          />
        </Field>

        <Field label="Sun exposure" htmlFor="log-sun">
          <Select id="log-sun" value={sun} onChange={(e) => setSun(e.target.value as SunExposure)}>
            <option value="full">Full</option>
            <option value="partial">Partial</option>
            <option value="shade">Shade</option>
          </Select>
        </Field>

        <Field label="Date planted" htmlFor="log-date">
          <TextInput
            id="log-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Note" htmlFor="log-note" helper="One line, optional.">
            <TextInput
              id="log-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cloched the first week."
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <Button onClick={save} disabled={!cropName}>
          {entry ? "Save changes" : "Save entry"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Panel>
  );
}
