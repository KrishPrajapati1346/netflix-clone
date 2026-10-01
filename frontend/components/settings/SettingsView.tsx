'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { LANGUAGES, MATURITY_RATINGS, type MaturityRating } from '@shared';
import { profileApi } from '@/lib/api/profiles';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { ShareProfilePanel } from '@/components/social/ShareProfilePanel';
import { cn } from '@/lib/utils';

/**
 * Per-profile settings.
 *
 * Deliberately profile-scoped rather than account-scoped: playback speed,
 * subtitles, language and maturity are all things household members disagree
 * about, and storing them on the account would make one person's choice
 * everyone's.
 */
export function SettingsView() {
  const { activeProfile, refreshProfile } = useProfile();
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (changes: Parameters<typeof profileApi.update>[1]) =>
      profileApi.update(activeProfile!.id, changes),
    onSuccess: async () => {
      toast.success('Settings saved');
      await refreshProfile();
    },
    onError: (err) => setError(toApiError(err).message),
  });

  if (!activeProfile) return null;

  const { playback, notifications } = activeProfile;

  return (
    <div className="mx-auto max-w-3xl px-(--gutter) py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-fg-subtle">
        These apply to <strong className="text-fg-muted">{activeProfile.name}</strong> only. Each
        profile keeps its own.
      </p>

      {error && (
        <div className="mt-6">
          <FormAlert tone="danger">{error}</FormAlert>
        </div>
      )}

      <div className="mt-8 space-y-8">
        <Section title="Playback" description="How video behaves for this profile.">
          <Toggle
            label="Autoplay the next episode"
            description="Start the following episode automatically when one ends."
            checked={playback.autoplayNextEpisode}
            onChange={(value) => save.mutate({ playback: { autoplayNextEpisode: value } })}
          />
          <Toggle
            label="Autoplay previews while browsing"
            description="Play trailers when you hover a title."
            checked={playback.autoplayPreviews}
            onChange={(value) => save.mutate({ playback: { autoplayPreviews: value } })}
          />
          <Toggle
            label="Reduce motion"
            description="Disable card zoom and page transitions. Also honours your system setting."
            checked={playback.reducedMotion}
            onChange={(value) => save.mutate({ playback: { reducedMotion: value } })}
          />

          <Field label="Default quality" hint="Auto adapts to your connection.">
            <select
              value={playback.defaultQuality}
              onChange={(event) =>
                save.mutate({ playback: { defaultQuality: event.target.value as never } })
              }
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm"
            >
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </Field>
        </Section>

        <Section title="Subtitles" description="Shown when a title has a matching track.">
          <Toggle
            label="Show subtitles by default"
            checked={playback.subtitlesEnabled}
            onChange={(value) => save.mutate({ playback: { subtitlesEnabled: value } })}
          />

          <Field label="Subtitle language">
            <select
              value={playback.subtitleLanguage ?? ''}
              onChange={(event) =>
                save.mutate({
                  playback: {
                    subtitleLanguage: (event.target.value || null) as never,
                  },
                })
              }
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm"
            >
              <option value="">Match interface language</option>
              {LANGUAGES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Language and maturity" description="What this profile sees.">
          <Field label="Interface language">
            <select
              value={activeProfile.language}
              onChange={(event) => save.mutate({ language: event.target.value as never })}
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm"
            >
              {LANGUAGES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Maturity limit"
            hint={
              activeProfile.isKids
                ? 'Fixed while this is a kids profile. Enforced by the server on every request.'
                : 'Titles above this rating are hidden everywhere, including search.'
            }
          >
            <select
              value={activeProfile.maturityLimit}
              disabled={activeProfile.isKids}
              onChange={(event) =>
                save.mutate({ maturityLimit: event.target.value as MaturityRating })
              }
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm disabled:opacity-60"
            >
              {MATURITY_RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Notifications" description="What reaches this profile.">
          <Toggle
            label="New content"
            checked={notifications.newContent}
            onChange={(value) => save.mutate({ notifications: { newContent: value } })}
          />
          <Toggle
            label="Watch party invites"
            checked={notifications.partyInvites}
            onChange={(value) => save.mutate({ notifications: { partyInvites: value } })}
          />
          <Toggle
            label="Follow activity"
            checked={notifications.followActivity}
            onChange={(value) => save.mutate({ notifications: { followActivity: value } })}
          />
          <Toggle
            label="Review likes"
            checked={notifications.reviewLikes}
            onChange={(value) => save.mutate({ notifications: { reviewLikes: value } })}
          />
        </Section>

        <Section title="Sharing" description="Whether other people can find this profile.">
          <ShareProfilePanel />
        </Section>

        <Section title="Account" description="Settings that apply to every profile.">
          <Button asChild variant="outline">
            <a href="/account">Password and sessions</a>
          </Button>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="text-lg font-bold tracking-tight">
        {title}
      </h2>
      <p className="mb-3 text-sm text-fg-subtle">{description}</p>
      <div className="space-y-3 rounded-panel border border-line p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-fg-subtle">{hint}</span>}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-fg-subtle">{description}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          checked ? 'bg-accent' : 'bg-surface-overlay',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
