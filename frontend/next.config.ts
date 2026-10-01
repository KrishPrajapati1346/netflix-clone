import type { NextConfig } from 'next';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  reactStrictMode: true,


  images: {
    // Poster and backdrop artwork comes from TMDB, uploads from Cloudinary.
    // Listing exact hosts (rather than allowing any) stops the optimizer being
    // used as an open image proxy for arbitrary URLs.
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
      // Real posters for the public-domain catalog come from Wikimedia Commons.
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';

    /**
     * Hosts serving the sample HLS streams.
     *
     * hls.js fetches the manifest and each segment over XHR and then feeds them
     * to the video element through a MediaSource blob, so these hosts must be
     * allowed in BOTH `connect-src` (the fetches) and `media-src` (Safari, which
     * plays HLS natively and loads the manifest as media rather than data).
     */
    const streamHosts = [
      'https://test-streams.mux.dev',
      'https://devstreaming-cdn.apple.com',
      // Most of the catalog streams its real print from the Internet Archive.
      // The wildcard is required, not lazy: archive.org 302s every download to
      // whichever storage node holds the item (dn710703.ca.archive.org and
      // friends), and those hostnames are not fixed.
      'https://archive.org',
      'https://*.archive.org',
    ].join(' ');

    /**
     * Content Security Policy.
     *
     * `unsafe-inline` on styles is required by Tailwind's runtime style
     * injection and by Framer Motion, which sets inline transforms. Scripts are
     * kept stricter; `unsafe-eval` is dev-only, where React Refresh needs it.
     *
     * `media-src` and `connect-src` include blob: because hls.js feeds segments
     * to the video element through MediaSource blob URLs.
     */
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      // `${apiUrl}` is required for the generated placeholder artwork, which the
      // API renders as SVG per title when a poster has no stored URL.
      `img-src 'self' data: blob: ${apiUrl} https://upload.wikimedia.org https://image.tmdb.org https://res.cloudinary.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com`,
      "font-src 'self' data:",
      `media-src 'self' blob: data: ${apiUrl} ${streamHosts} https://res.cloudinary.com`,
      `connect-src 'self' blob: ${apiUrl} ${apiUrl.replace(/^http/, 'ws')} ${streamHosts}`,
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
