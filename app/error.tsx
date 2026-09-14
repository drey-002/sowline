"use client";

// Catches a render or data error anywhere in the app. Without this, a throw
// leaves a blank page in production — and the gardener's plan is still safely
// in localStorage, which is the reassuring thing to say.
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[1180px] md:px-6 md:py-8">
      <div className="overflow-hidden border-border-strong bg-surface p-6 md:rounded-[6px] md:border md:p-10">
        <div className="mx-auto max-w-[640px]">
          <div className="rounded-[6px] border border-error-border bg-error-fill p-5">
            <h1 className="text-[17px] font-semibold text-error-heading">Something went wrong</h1>
            <p className="mt-2 text-[14px] text-ink-body-2">
              Your season plan is saved in this browser and has not been lost.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <button
              onClick={reset}
              className="inline-flex cursor-pointer items-center justify-center rounded-[6px] border border-accent bg-accent px-4 py-[14px] text-[15px] font-semibold text-white hover:bg-accent-hover md:rounded-[5px] md:px-[18px] md:py-[10px] md:text-[14px]"
            >
              Try again
            </button>
            <a
              href="/crops"
              className="inline-flex items-center justify-center rounded-[6px] border border-[#c8cec9] bg-surface px-4 py-[14px] text-[15px] font-semibold text-accent hover:border-accent md:rounded-[5px] md:px-[18px] md:py-[10px] md:text-[14px]"
            >
              Back to crops
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
