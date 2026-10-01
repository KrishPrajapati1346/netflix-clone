import { cn } from '@/lib/utils';

/**
 * Full-viewport loading state for route transitions and auth checks.
 *
 * `role="status"` with an `aria-live` region announces the wait to screen
 * readers; the visible pulse is decorative and hidden from them.
 */
export function FullPageSpinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 bg-canvas',
        className,
      )}
    >
      <span className="relative flex size-10" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-25" />
        <span className="relative inline-flex size-10 items-center justify-center rounded-full border-2 border-accent border-t-transparent motion-safe:animate-spin" />
      </span>
      <span className="text-sm text-fg-subtle">{label}…</span>
    </div>
  );
}
