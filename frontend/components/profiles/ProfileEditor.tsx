'use client';

import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  LANGUAGES,
  MATURITY_RATINGS,
  PROFILE_PIN_LENGTH,
  type MaturityRating,
  type ProfileDTO,
} from '@shared';
import { profileApi } from '@/lib/api/profiles';
import { toApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { AVATAR_KEYS, ProfileAvatar } from './ProfileAvatar';
import { cn } from '@/lib/utils';

/**
 * Create/edit dialog for a profile.
 *
 * The kids toggle is not just a label: turning it on caps the maturity limit
 * and disables the control, because a "kids" profile whose rating ceiling can
 * still be raised to TV-MA is worse than no kids mode at all — it looks like a
 * protection while providing none.
 */
export function ProfileEditor({
  profile,
  onClose,
  onSaved,
}: {
  profile: ProfileDTO | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isEdit = profile !== null;

  const [name, setName] = useState(profile?.name ?? '');
  const [avatarKey, setAvatarKey] = useState(profile?.avatarKey ?? 'ember');
  const [isKids, setIsKids] = useState(profile?.isKids ?? false);
  const [language, setLanguage] = useState(profile?.language ?? 'en');
  const [maturityLimit, setMaturityLimit] = useState<MaturityRating>(
    profile?.maturityLimit ?? 'TV-MA',
  );
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [removePin, setRemovePin] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        await profileApi.update(profile.id, {
          name,
          avatarKey,
          isKids,
          language: language as never,
          maturityLimit: isKids ? 'PG' : maturityLimit,
        });

        // PIN changes go through a dedicated endpoint: it requires the current
        // PIN, which a general profile update deliberately does not.
        if (removePin && profile.hasPin) {
          await profileApi.setPin(profile.id, null, currentPin);
        } else if (pin.length === PROFILE_PIN_LENGTH) {
          await profileApi.setPin(profile.id, pin, profile.hasPin ? currentPin : undefined);
        }
      } else {
        await profileApi.create({
          name,
          avatarKey,
          isKids,
          language: language as never,
          maturityLimit: isKids ? 'PG' : maturityLimit,
          ...(pin.length === PROFILE_PIN_LENGTH ? { pin } : {}),
        });
      }
    },
    onSuccess: async () => {
      toast.success(isEdit ? 'Profile updated' : 'Profile created');
      await onSaved();
    },
    onError: (error) => setFormError(toApiError(error).message),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit profile' : 'Create profile'}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="my-8 w-full max-w-lg rounded-panel border border-line bg-surface p-7"
      >
        <h2 className="text-xl font-bold">{isEdit ? 'Edit profile' : 'Add a profile'}</h2>

        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);
            save.mutate();
          }}
        >
          {formError && <FormAlert tone="danger">{formError}</FormAlert>}

          <div className="flex items-center gap-4">
            <ProfileAvatar name={name || 'New'} avatarKey={avatarKey} size="md" />
            <div className="flex-1">
              <Input
                label="Profile name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={30}
                required
                autoFocus
                placeholder="e.g. Sam"
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-fg-muted">Avatar</legend>
            <div className="flex flex-wrap gap-2">
              {AVATAR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAvatarKey(key)}
                  aria-label={`Avatar ${key}`}
                  aria-pressed={avatarKey === key}
                  className={cn(
                    'rounded-lg transition-transform duration-150 hover:scale-105',
                    avatarKey === key && 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--color-surface)]',
                  )}
                >
                  <ProfileAvatar name={name || 'A'} avatarKey={key} size="sm" />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fg-muted">Language</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as never)}
                className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm"
              >
                {LANGUAGES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fg-muted">Maturity limit</span>
              <select
                value={isKids ? 'PG' : maturityLimit}
                onChange={(event) => setMaturityLimit(event.target.value as MaturityRating)}
                disabled={isKids}
                className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm disabled:opacity-60"
              >
                {MATURITY_RATINGS.map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-control bg-surface-raised p-3.5">
            <input
              type="checkbox"
              checked={isKids}
              onChange={(event) => setIsKids(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span className="text-sm">
              <span className="font-medium">Kids profile</span>
              <span className="mt-0.5 block text-fg-subtle">
                Shows only titles rated G, PG, TV-Y, TV-G and TV-PG. The maturity limit is fixed
                while this is on, and enforced by the server on every request.
              </span>
            </span>
          </label>

          <fieldset className="rounded-control border border-line p-3.5">
            <legend className="px-1 text-sm font-medium text-fg-muted">
              PIN lock {profile?.hasPin ? '(currently on)' : '(optional)'}
            </legend>

            {profile?.hasPin && (
              <Input
                label="Current PIN"
                value={currentPin}
                onChange={(event) =>
                  setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, PROFILE_PIN_LENGTH))
                }
                inputMode="numeric"
                maxLength={PROFILE_PIN_LENGTH}
                placeholder="••••"
                hint="Required to change or remove the PIN."
              />
            )}

            {!removePin && (
              <div className={profile?.hasPin ? 'mt-3' : ''}>
                <Input
                  label={profile?.hasPin ? 'New PIN' : 'Set a PIN'}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, '').slice(0, PROFILE_PIN_LENGTH))
                  }
                  inputMode="numeric"
                  maxLength={PROFILE_PIN_LENGTH}
                  placeholder="••••"
                  hint={`${PROFILE_PIN_LENGTH} digits. Leave blank to keep it unlocked.`}
                />
              </div>
            )}

            {profile?.hasPin && (
              <label className="mt-3 flex items-center gap-2 text-sm text-fg-muted">
                <input
                  type="checkbox"
                  checked={removePin}
                  onChange={(event) => setRemovePin(event.target.checked)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                Remove the PIN lock
              </label>
            )}
          </fieldset>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" block onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" block isLoading={save.isPending} disabled={name.trim().length === 0}>
              {isEdit ? 'Save changes' : 'Create profile'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
