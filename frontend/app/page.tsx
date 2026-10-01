import Link from 'next/link';
import { Clapperboard, ListVideo, Users } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';

/**
 * Public landing page.
 *
 * Rendered as a server component with no data requirements, so it is fully
 * static and paints immediately — no auth round-trip before first content.
 */
export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 size-[40rem] rounded-full bg-accent opacity-[0.08] blur-[140px]" />
        <div className="absolute -bottom-40 right-1/4 size-[36rem] rounded-full bg-info opacity-[0.08] blur-[140px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo href={null} />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main id="main" className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-14 sm:px-8 sm:pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          A portfolio streaming platform
        </p>

        <h1 className="mt-4 max-w-3xl text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[1.03] tracking-[-0.035em]">
          Stream what moves you.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
          Kinora is a full-stack demonstration of a modern streaming product — catalog browsing,
          adaptive playback, personal recommendations, and synchronised watch parties.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/register">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">I already have one</Link>
          </Button>
        </div>

        <ul className="mt-20 grid gap-5 sm:grid-cols-3">
          <Feature
            icon={<Clapperboard aria-hidden="true" />}
            title="A real catalog"
            body="Films and series with seasons, episodes, cast and chapters — browsable, filterable, and resumable."
          />
          <Feature
            icon={<ListVideo aria-hidden="true" />}
            title="Built around you"
            body="Up to five profiles per account, each with its own lists, history and recommendations."
          />
          <Feature
            icon={<Users aria-hidden="true" />}
            title="Watch together"
            body="Host a synchronised watch party with live chat and shared playback control."
          />
        </ul>

        <p className="mt-20 max-w-2xl text-sm leading-relaxed text-fg-subtle">
          Kinora is an independent portfolio project built for demonstration purposes. It is not
          affiliated with, endorsed by, or connected to any commercial streaming service. Catalog
          metadata is supplied by TMDB; playback uses royalty-free sample footage.
        </p>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-panel border border-line bg-surface/60 p-6 backdrop-blur">
      <span className="inline-flex size-10 items-center justify-center rounded-control bg-accent-soft text-accent [&_svg]:size-5">
        {icon}
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </li>
  );
}
