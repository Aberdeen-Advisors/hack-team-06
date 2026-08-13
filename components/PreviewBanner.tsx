import Link from 'next/link';

/**
 * Shown when an Aberdeen user is viewing the client portal with ?preview=1. It exists so nobody
 * mistakes the preview for the client's own view, or forgets they are looking at published data.
 */
export function PreviewBanner({ publishedVersion }: { publishedVersion: number | null }) {
  return (
    <div className="bg-[var(--color-amber-soft)] border-b border-[var(--color-amber-line)] no-print">
      <div className="mx-auto max-w-[1180px] px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--color-amber)]">
          <span className="label mr-2">Aberdeen preview</span>
          You are seeing the client portal exactly as the client sees it
          {publishedVersion === null
            ? ' — nothing has been published yet, so it is empty.'
            : `, reading published version ${publishedVersion}. Edits in the workspace do not appear here until you publish again.`}
        </p>
        <Link href="/workspace" className="label hover:text-[var(--color-ink)] whitespace-nowrap">
          Back to workspace
        </Link>
      </div>
    </div>
  );
}
