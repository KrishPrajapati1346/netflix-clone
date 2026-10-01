import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
      <Logo />
      <p className="text-[clamp(3rem,10vw,5rem)] font-extrabold leading-none tracking-tighter text-surface-overlay">
        404
      </p>
      <div>
        <h1 className="text-xl font-bold">We couldn&apos;t find that page</h1>
        <p className="mt-2 max-w-sm text-sm text-fg-muted">
          The link may be broken, or the title may have left the catalog.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to Kinora</Link>
      </Button>
    </div>
  );
}
