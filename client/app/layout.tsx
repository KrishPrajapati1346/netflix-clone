import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

/**
 * Inter, self-hosted by `next/font`.
 *
 * `next/font` downloads and serves the font from our own origin at build time,
 * so there is no render-blocking request to Google's CDN and no third-party
 * connection for a user's browser to make. `display: swap` means text paints
 * immediately in the fallback rather than sitting invisible.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Kinora — Stream what moves you',
    template: '%s · Kinora',
  },
  description:
    'Kinora is a demonstration streaming platform: browse a curated catalog, build watchlists, and watch together in real time.',
  applicationName: 'Kinora',
  // This is a portfolio project, not a product competing for search traffic.
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0f',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-canvas text-fg antialiased">
        {/*
          Skip link: the first thing a keyboard user reaches, letting them jump
          past the nav instead of tabbing through every row link on the page.
          Visually hidden until focused.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-fg-inverse"
        >
          Skip to main content
        </a>

        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
