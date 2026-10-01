import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Kinora wordmark.
 *
 * Original branding, deliberately: cloning a real streaming service's logo or
 * typeface is a trademark problem once this is on a public URL, and it makes
 * the project read as traced rather than built. The mark is an inline SVG so it
 * inherits `currentColor` and needs no network request.
 */
export function Logo({
  className,
  href = '/',
  showWordmark = true,
}: {
  className?: string;
  href?: string | null;
  showWordmark?: boolean;
}) {
  const mark = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 28 28"
        className="size-7 shrink-0"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* An aperture-like ring with a play notch — cinema plus playback. */}
        <circle cx="14" cy="14" r="12.5" stroke="var(--color-accent)" strokeWidth="2.5" />
        <path d="M11.2 9.4v9.2l7.4-4.6-7.4-4.6Z" fill="var(--color-accent)" />
      </svg>
      {showWordmark && (
        <span className="text-[1.35rem] font-extrabold leading-none tracking-[-0.045em] text-fg">
          Kinora
        </span>
      )}
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="rounded-sm" aria-label="Kinora home">
      {mark}
    </Link>
  );
}
