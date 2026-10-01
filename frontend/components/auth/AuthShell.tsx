import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';

/**
 * Shared frame for every unauthenticated page.
 *
 * The backdrop is a pair of soft radial washes rather than a photograph: it
 * keeps the auth pages fast (no hero image to download before first paint) and
 * avoids the legibility problems of putting a form over artwork.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 size-[34rem] rounded-full bg-accent opacity-[0.07] blur-[120px]" />
        <div className="absolute -bottom-52 -right-32 size-[36rem] rounded-full bg-info opacity-[0.07] blur-[130px]" />
      </div>

      <header className="relative z-10 px-6 py-6 sm:px-10">
        <Logo />
      </header>

      <main id="main" className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[26rem]">
          <div className="rounded-panel border border-line bg-surface/80 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
            <h1 className="text-[1.75rem] font-bold leading-tight">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{subtitle}</p>
            )}
            <div className="mt-7">{children}</div>
          </div>

          {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
