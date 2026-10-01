'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import type { VideoSource } from '@shared';

export interface QualityLevel {
  /** hls.js level index, or -1 for automatic selection. */
  index: number;
  label: string;
  height: number;
  bitrate: number;
}

export interface HlsState {
  levels: QualityLevel[];
  currentLevel: number;
  isAuto: boolean;
  isNative: boolean;
  error: string | null;
}

/**
 * Attaches an adaptive HLS stream to a `<video>` element.
 *
 * Two playback paths, because they genuinely differ:
 *
 *  - **Safari (and iOS)** plays HLS natively. hls.js explicitly refuses to run
 *    there for good reason — MSE is unavailable or crippled, and the native
 *    engine is better. So the manifest is set as `src` directly, and the
 *    quality menu is hidden because level selection is not exposed.
 *  - **Everywhere else**, hls.js is loaded and attached, giving real ABR plus a
 *    quality ladder the viewer can override.
 *
 * hls.js is imported dynamically so its ~200 kB never lands in the bundle for
 * pages that do not play video — which is every page but this one.
 */
export function useHlsPlayer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  sources: VideoSource[],
) {
  const hlsRef = useRef<Hls | null>(null);
  const [state, setState] = useState<HlsState>({
    levels: [],
    currentLevel: -1,
    isAuto: true,
    isNative: false,
    error: null,
  });

  const primary = sources.find((source) => source.label === 'auto') ?? sources[0];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !primary) return;

    let disposed = false;

    const canPlayNatively = video.canPlayType('application/vnd.apple.mpegurl') !== '';

    // A progressive MP4 needs none of this machinery, and Safari plays HLS
    // natively. Both take the same path: point `src` at the URL and hide the
    // quality menu, because neither exposes a level ladder.
    if (primary.type === 'mp4' || canPlayNatively) {
      video.src = primary.url;
      // Deferred so the state update lands outside the effect body rather than
      // triggering a cascading render during commit.
      queueMicrotask(() => {
        if (!disposed) setState((prev) => ({ ...prev, isNative: true, levels: [], error: null }));
      });
      return;
    }

    void (async () => {
      const { default: HlsCtor } = await import('hls.js');
      if (disposed) return;

      if (!HlsCtor.isSupported()) {
        setState((prev) => ({
          ...prev,
          error: 'This browser cannot play adaptive streams.',
        }));
        return;
      }

      const hls = new HlsCtor({
        // Keep a modest forward buffer: the free-tier demo has no CDN behind
        // it, and buffering 10 minutes ahead wastes bandwidth on a clip the
        // viewer may abandon in twenty seconds.
        maxBufferLength: 30,
        maxMaxBufferLength: 90,
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current = hls;
      hls.loadSource(primary.url);
      hls.attachMedia(video);

      hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
        if (disposed) return;
        setState((prev) => ({
          ...prev,
          error: null,
          levels: hls.levels
            .map((level, index) => ({
              index,
              height: level.height,
              bitrate: level.bitrate,
              label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`,
            }))
            // Highest quality first, which is the order a quality menu reads in.
            .sort((a, b) => b.height - a.height),
        }));
      });

      hls.on(HlsCtor.Events.LEVEL_SWITCHED, (_event, data) => {
        if (disposed) return;
        setState((prev) => ({ ...prev, currentLevel: data.level }));
      });

      hls.on(HlsCtor.Events.ERROR, (_event, data) => {
        if (disposed || !data.fatal) return;

        // Fatal network and media errors are often recoverable; hls.js exposes
        // exactly the right recovery for each, so try before giving up.
        switch (data.type) {
          case HlsCtor.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case HlsCtor.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            setState((prev) => ({
              ...prev,
              error: 'Playback failed. The stream may be unavailable.',
            }));
            hls.destroy();
        }
      });
    })();

    return () => {
      disposed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [primary, videoRef]);

  /** `-1` restores automatic bitrate selection. */
  const setQuality = useCallback((levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = levelIndex;
    setState((prev) => ({ ...prev, isAuto: levelIndex === -1, currentLevel: levelIndex }));
  }, []);

  return { ...state, setQuality };
}
