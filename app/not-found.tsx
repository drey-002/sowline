import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1180px] md:px-6 md:py-8">
      <div className="overflow-hidden border-border-strong bg-surface p-6 md:rounded-[6px] md:border md:p-10">
        <div className="mx-auto max-w-[640px]">
          <div className="rounded-[6px] border border-dashed border-line-dashed bg-subtle-2 p-6">
            <h1 className="text-[18px] font-semibold text-ink">Page not found</h1>
            <p className="mt-2 text-[14px] text-ink-body-2">
              That address is not part of the planning flow.
            </p>
            <div className="mt-5">
              <Link
                href="/crops"
                className="inline-flex items-center justify-center rounded-[6px] border border-accent bg-accent px-4 py-[14px] text-[15px] font-semibold text-white hover:bg-accent-hover md:rounded-[5px] md:px-[18px] md:py-[10px] md:text-[14px]"
              >
                Back to crop recommendations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
