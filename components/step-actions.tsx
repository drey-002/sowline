import { ButtonLink } from "./ui";

/**
 * Forward and backward navigation for a step. Back sits first in the DOM so
 * reading order matches the visual order at both widths; on a phone that puts
 * Continue lower, which is also the easier reach.
 */
export function StepActions({
  backHref,
  backLabel,
  continueHref,
  continueLabel,
}: {
  backHref: string;
  backLabel: string;
  continueHref?: string;
  continueLabel?: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 md:flex-row">
      <ButtonLink href={backHref} variant="secondary" className="w-full md:w-auto">
        ← {backLabel}
      </ButtonLink>
      {continueHref && continueLabel && (
        <ButtonLink href={continueHref} className="w-full md:w-auto">
          {continueLabel}
        </ButtonLink>
      )}
    </div>
  );
}
