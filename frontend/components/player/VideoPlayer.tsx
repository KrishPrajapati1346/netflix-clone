'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Settings,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Chapter, SubtitleTrack, VideoSource } from '@shared';
import { useHlsPlayer } from '@/hooks/useHlsPlayer';
import { cn, clamp, formatTimecode } from '@/lib/utils';

export interface PlayerTitle {
  title: string;
  subtitle?: string;
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
  chapters: Chapter[];
  /** Seconds to resume from; 0 starts at the beginning. */
  startAt?: number;
}

/**
 * The video player.
 *
 * Controls are custom rather than the browser's default set, because the
 * feature list (quality ladder, skip-intro, next-episode countdown, theater
 * mode) has no native equivalent. Everything below is wired to the real media
 * element, so native behaviours — buffering, seeking, track switching — are
 * driven rather than reimplemented.
 */
export function VideoPlayer({
  media,
  onProgress,
  onEnded,
  nextLabel,
  onNext,
}: {
  media: PlayerTitle;
  /** Called on a throttled cadence and on pause/unload. */
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  onEnded?: () => void;
  nextLabel?: string;
  onNext?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { levels, currentLevel, isAuto, isNative, error, setQuality } = useHlsPlayer(
    videoRef,
    media.sources,
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resumed = useRef(false);
  const lastReport = useRef(0);

  /**
   * Callback props held in refs, read by effects that must not re-subscribe.
   *
   * `onProgress` is recreated on every render of the parent (it closes over a
   * mutation whose identity changes as the request settles). Depending on it
   * directly would re-run the effects below constantly — and because the
   * unmount effect flushes progress in its cleanup, that became an infinite
   * loop: flush -> mutate -> new identity -> cleanup -> flush.
   *
   * Refs give the effects the latest callback while keeping their dependency
   * lists empty, so "on unmount" genuinely means on unmount.
   */
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onNextRef = useRef(onNext);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
    onNextRef.current = onNext;
  });

  /* ---------------------------------------------------------------- controls */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = clamp(seconds, 0, video.duration);
  }, []);

  const skip = useCallback(
    (delta: number) => seekTo((videoRef.current?.currentTime ?? 0) + delta),
    [seekTo],
  );

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await container.requestFullscreen().catch(() => undefined);
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // Picture-in-picture is unavailable in some browsers and disabled by
      // policy in others; neither is worth interrupting playback for.
    }
  }, []);

  /* ------------------------------------------------------------ auto-hide UI */

  const nudgeControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      // Never hide while paused or while a menu is open — a viewer who paused
      // is looking at the controls on purpose.
      if (videoRef.current && !videoRef.current.paused && !settingsOpen) setShowControls(false);
    }, 3000);
  }, [settingsOpen]);

  useEffect(() => {
    /*
      Arm the initial auto-hide without calling `nudgeControls` directly:
      controls already start visible, so setting that state synchronously in an
      effect would be a redundant render on mount.
    */
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !settingsOpen) setShowControls(false);
    }, 3000);

    return () => clearTimeout(hideTimer.current);
  }, [settingsOpen]);

  /* -------------------------------------------------------------- media wiring */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      setDuration(video.duration);
      // Resume once, after metadata lands — seeking earlier is ignored because
      // the media has no seekable range yet.
      if (!resumed.current && media.startAt && media.startAt > 0) {
        resumed.current = true;
        video.currentTime = media.startAt;
      }
    };

    const onTime = () => {
      setPosition(video.currentTime);

      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }

      // Report at most every 5 seconds: the player fires timeupdate ~4x/second,
      // and a write per tick would hammer the API for no extra fidelity.
      const now = Date.now();
      if (now - lastReport.current > 5000 && video.duration > 0) {
        lastReport.current = now;
        onProgressRef.current?.(video.currentTime, video.duration);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      nudgeControls();
    };
    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (video.duration > 0) onProgressRef.current?.(video.currentTime, video.duration);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onEnd = () => {
      setIsPlaying(false);
      if (video.duration > 0) onProgressRef.current?.(video.duration, video.duration);
      onEndedRef.current?.();
      if (onNextRef.current) setCountdown(10);
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('volumechange', onVolume);
    video.addEventListener('ended', onEnd);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('volumechange', onVolume);
      video.removeEventListener('ended', onEnd);
    };
    // Callbacks are read through refs, so this subscribes once per media item
    // rather than on every parent render.
  }, [media.startAt, nudgeControls]);

  /**
   * Save on the way out.
   *
   * `pagehide` rather than `beforeunload`: it fires on mobile tab switches and
   * back/forward-cache navigations, which is exactly when someone abandons a
   * video, and `beforeunload` does not.
   */
  useEffect(() => {
    const flush = () => {
      const video = videoRef.current;
      if (video && video.duration > 0 && video.currentTime > 0) {
        onProgressRef.current?.(video.currentTime, video.duration);
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      // Empty dependency list, so this cleanup runs only on real unmount —
      // which is what makes "save where they stopped" correct rather than a
      // save on every re-render.
      flush();
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* ---------------------------------------------------------------- keyboard */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Never hijack typing in a field — chat in a watch party shares this page.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const video = videoRef.current;
      if (!video) return;

      const handlers: Record<string, () => void> = {
        ' ': togglePlay,
        k: togglePlay,
        ArrowRight: () => skip(10),
        ArrowLeft: () => skip(-10),
        l: () => skip(10),
        j: () => skip(-10),
        ArrowUp: () => {
          video.volume = clamp(video.volume + 0.1, 0, 1);
        },
        ArrowDown: () => {
          video.volume = clamp(video.volume - 0.1, 0, 1);
        },
        m: () => {
          video.muted = !video.muted;
        },
        f: () => void toggleFullscreen(),
        p: () => void togglePip(),
        Escape: () => {
          if (!document.fullscreenElement) router.back();
        },
      };

      // Number keys 0–9 seek to that decile, the familiar convention.
      if (/^[0-9]$/.test(event.key) && Number.isFinite(video.duration)) {
        event.preventDefault();
        seekTo((Number(event.key) / 10) * video.duration);
        nudgeControls();
        return;
      }

      const handler = handlers[event.key];
      if (!handler) return;

      event.preventDefault();
      handler();
      nudgeControls();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudgeControls, router, seekTo, skip, togglePip, togglePlay, toggleFullscreen]);

  /* ------------------------------------------------------- next-up countdown */

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      onNextRef.current?.();
      return;
    }
    const timer = setTimeout(() => setCountdown((value) => (value ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  /* ------------------------------------------------------------------ chapters */

  const activeChapter = media.chapters.find(
    (chapter) => position >= chapter.startSeconds && position < chapter.endSeconds,
  );
  const skippable = activeChapter && activeChapter.kind !== 'credits' ? activeChapter : null;

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full bg-black"
      onMouseMove={nudgeControls}
      onClick={(event) => {
        if (event.target === event.currentTarget) togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="size-full"
        playsInline
        autoPlay
        onClick={togglePlay}
      >
        {media.subtitles.map((track) => (
          <track
            key={track.url}
            kind="subtitles"
            src={track.url}
            srcLang={track.language}
            label={track.label}
            default={track.isDefault}
          />
        ))}
      </video>

      {isBuffering && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status">
          <Loader2 className="size-12 animate-spin text-accent" aria-hidden="true" />
          <span className="sr-only">Buffering</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/90 p-6 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Go back
          </button>
        </div>
      )}

      {/* Skip intro / recap, only while inside a chapter that has one. */}
      <AnimatePresence>
        {skippable && showControls && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            type="button"
            onClick={() => seekTo(skippable.endSeconds)}
            className="absolute bottom-28 right-(--gutter) z-20 rounded-control border border-white/30 bg-black/70 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-black/90"
          >
            Skip {skippable.kind}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Next episode countdown */}
      <AnimatePresence>
        {countdown !== null && onNext && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-28 right-(--gutter) z-20 w-72 rounded-panel border border-line bg-surface-overlay/95 p-4 backdrop-blur"
          >
            <p className="text-xs uppercase tracking-wide text-fg-subtle">Next episode</p>
            <p className="mt-1 line-clamp-1 font-semibold">{nextLabel}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onNext}
                className="flex-1 rounded-control bg-accent px-3 py-2 text-sm font-semibold text-fg-inverse"
              >
                Play now ({countdown})
              </button>
              <button
                type="button"
                onClick={() => setCountdown(null)}
                className="rounded-control border border-line-strong px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-t from-black/85 via-transparent to-black/60"
          >
            <div className="flex items-start gap-3 p-(--gutter)">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Back"
                className="rounded-full p-2 text-white/90 transition-colors hover:bg-white/10"
              >
                <ArrowLeft className="size-6" aria-hidden="true" />
              </button>
              <div className="min-w-0 pt-1">
                <p className="truncate text-lg font-semibold text-white">{media.title}</p>
                {media.subtitle && (
                  <p className="truncate text-sm text-white/70">{media.subtitle}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 p-(--gutter)">
              {/* Scrubber. A range input rather than a div, so it is keyboard
                  operable and announced correctly, with the visual track drawn
                  behind it. */}
              <div className="group/scrub relative h-5">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full bg-white/40" style={{ width: `${bufferedPercent}%` }} />
                  <div
                    className="absolute inset-y-0 left-0 bg-accent"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={position}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  aria-label="Seek"
                  aria-valuetext={`${formatTimecode(position)} of ${formatTimecode(duration)}`}
                  className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:opacity-0 group-hover/scrub:[&::-webkit-slider-thumb]:opacity-100"
                />
              </div>

              <div className="flex items-center gap-1 text-white">
                <ControlButton onClick={togglePlay} label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                </ControlButton>

                {onNext && (
                  <ControlButton onClick={onNext} label="Next episode">
                    <SkipForward className="fill-current" />
                  </ControlButton>
                )}

                <div className="group/vol flex items-center">
                  <ControlButton
                    onClick={() => {
                      const video = videoRef.current;
                      if (video) video.muted = !video.muted;
                    }}
                    label={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
                  </ControlButton>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(event) => {
                      const video = videoRef.current;
                      if (!video) return;
                      video.volume = Number(event.target.value);
                      video.muted = Number(event.target.value) === 0;
                    }}
                    aria-label="Volume"
                    className="w-0 cursor-pointer appearance-none opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100 focus:w-20 focus:opacity-100 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/40 [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>

                <span className="ml-2 text-xs tabular-nums text-white/80">
                  {formatTimecode(position)} / {formatTimecode(duration)}
                </span>

                <div className="ml-auto flex items-center gap-1">
                  <div className="relative">
                    <ControlButton
                      onClick={() => setSettingsOpen((open) => !open)}
                      label="Playback settings"
                      pressed={settingsOpen}
                    >
                      <Settings />
                    </ControlButton>

                    {settingsOpen && (
                      <div className="absolute bottom-12 right-0 w-52 rounded-panel border border-line bg-surface-overlay/97 p-3 text-sm shadow-2xl backdrop-blur">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                          Speed
                        </p>
                        <div className="mb-3 flex flex-wrap gap-1">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                const video = videoRef.current;
                                if (video) video.playbackRate = option;
                                setRate(option);
                              }}
                              className={cn(
                                'rounded px-2 py-1 text-xs transition-colors',
                                rate === option
                                  ? 'bg-accent text-fg-inverse'
                                  : 'bg-surface-raised text-fg-muted hover:text-fg',
                              )}
                            >
                              {option}×
                            </button>
                          ))}
                        </div>

                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                          Quality
                        </p>
                        {isNative ? (
                          <p className="text-xs text-fg-subtle">
                            Handled by the browser for this stream.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <QualityOption
                              active={isAuto}
                              onClick={() => setQuality(-1)}
                              label={`Auto${
                                isAuto && currentLevel >= 0
                                  ? ` (${levels.find((l) => l.index === currentLevel)?.label ?? ''})`
                                  : ''
                              }`}
                            />
                            {levels.map((level) => (
                              <QualityOption
                                key={level.index}
                                active={!isAuto && currentLevel === level.index}
                                onClick={() => setQuality(level.index)}
                                label={level.label}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <ControlButton onClick={() => void togglePip()} label="Picture in picture">
                    <PictureInPicture2 />
                  </ControlButton>

                  <ControlButton
                    onClick={() => void toggleFullscreen()}
                    label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize /> : <Maximize />}
                  </ControlButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  pressed,
  children,
}: {
  onClick: () => void;
  label: string;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="rounded-full p-2 text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&_svg]:size-5"
    >
      {children}
    </button>
  );
}

function QualityOption({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded px-2 py-1 text-left text-xs transition-colors',
        active ? 'bg-accent text-fg-inverse' : 'text-fg-muted hover:bg-surface-raised hover:text-fg',
      )}
    >
      {label}
    </button>
  );
}
