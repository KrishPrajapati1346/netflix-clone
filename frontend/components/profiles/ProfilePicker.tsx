'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { MAX_PROFILES_PER_ACCOUNT, PROFILE_PIN_LENGTH, type ProfileDTO } from '@shared';
import { profileApi } from '@/lib/api/profiles';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { Input } from '@/components/ui/input';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileEditor } from './ProfileEditor';

/**
 * "Who's watching?" — the profile picker.
 *
 * Selecting a profile is a real API call, not local state: it verifies the PIN
 * and mints the signed grant that authorises every profile-scoped request.
 */
export function ProfilePicker() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectProfile } = useProfile();

  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<ProfileDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [pinFor, setPinFor] = useState<ProfileDTO | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profiles'],
    queryFn: profileApi.list,
  });

  const enter = useMutation({
    mutationFn: ({ id, pinCode }: { id: string; pinCode?: string }) => selectProfile(id, pinCode),
    onSuccess: () => router.push('/browse'),
    onError: (err) => setPinError(toApiError(err).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => profileApi.remove(id),
    onSuccess: async () => {
      toast.success('Profile deleted');
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  if (isLoading) return <FullPageSpinner label="Loading profiles" />;

  const profiles = data?.profiles ?? [];
  const canAdd = profiles.length < MAX_PROFILES_PER_ACCOUNT;

  const onPick = (profile: ProfileDTO) => {
    if (managing) {
      setEditing(profile);
      return;
    }
    if (profile.hasPin) {
      // Locked: collect the PIN before attempting selection, so the failure
      // path is a form error rather than a rejected request.
      setPinFor(profile);
      setPin('');
      setPinError(null);
      return;
    }
    enter.mutate({ id: profile.id });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-(--gutter) py-6">
        <Logo href={null} />
      </header>

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-5 pb-20">
        <h1 className="text-center text-[clamp(1.75rem,5vw,3rem)] font-bold tracking-tight">
          {managing ? 'Manage profiles' : "Who's watching?"}
        </h1>

        {isError && (
          <div className="mt-6 w-full max-w-md">
            <FormAlert tone="danger">{toApiError(error).message}</FormAlert>
          </div>
        )}

        <ul className="mt-10 flex flex-wrap items-start justify-center gap-5 sm:gap-7">
          {profiles.map((profile, index) => (
            <motion.li
              key={profile.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="group flex w-28 flex-col items-center gap-2.5 sm:w-32">
                <button
                  type="button"
                  onClick={() => onPick(profile)}
                  className="relative rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  aria-label={
                    managing
                      ? `Edit ${profile.name}`
                      : `Watch as ${profile.name}${profile.hasPin ? ' (PIN required)' : ''}`
                  }
                >
                  <ProfileAvatar
                    name={profile.name}
                    avatarKey={profile.avatarKey}
                    avatarUrl={profile.avatarUrl}
                    size="lg"
                    className="transition-transform duration-200 ease-out-quick group-hover:scale-105"
                  />

                  {managing && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/55">
                      <Pencil className="size-7 text-white" aria-hidden="true" />
                    </span>
                  )}

                  {profile.hasPin && !managing && (
                    <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-canvas bg-surface-overlay">
                      <Lock className="size-3.5 text-fg-muted" aria-hidden="true" />
                    </span>
                  )}
                </button>

                <div className="text-center">
                  <p className="line-clamp-1 text-sm text-fg-muted transition-colors group-hover:text-fg">
                    {profile.name}
                  </p>
                  {profile.isKids && (
                    <span className="mt-0.5 inline-block rounded-full bg-info-soft px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-info">
                      Kids
                    </span>
                  )}
                </div>

                {managing && profiles.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Delete "${profile.name}" and all of its history?`)) {
                        remove.mutate(profile.id);
                      }
                    }}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                )}
              </div>
            </motion.li>
          ))}

          {canAdd && (
            <li>
              <div className="flex w-28 flex-col items-center gap-2.5 sm:w-32">
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  aria-label="Add a profile"
                  className="flex size-28 items-center justify-center rounded-2xl border-2 border-dashed border-line-strong text-fg-subtle transition-colors hover:border-fg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:size-32"
                >
                  <Plus className="size-9" aria-hidden="true" />
                </button>
                <p className="text-sm text-fg-muted">Add profile</p>
              </div>
            </li>
          )}
        </ul>

        <Button variant="outline" className="mt-12" onClick={() => setManaging((v) => !v)}>
          {managing ? 'Done' : 'Manage profiles'}
        </Button>
      </main>

      {pinFor && (
        <PinDialog
          profile={pinFor}
          pin={pin}
          error={pinError}
          isPending={enter.isPending}
          onPinChange={(value) => {
            setPin(value);
            setPinError(null);
          }}
          onCancel={() => setPinFor(null)}
          onSubmit={() => enter.mutate({ id: pinFor.id, pinCode: pin })}
        />
      )}

      {(creating || editing) && (
        <ProfileEditor
          profile={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await queryClient.invalidateQueries({ queryKey: ['profiles'] });
          }}
        />
      )}
    </div>
  );
}

function PinDialog({
  profile,
  pin,
  error,
  isPending,
  onPinChange,
  onCancel,
  onSubmit,
}: {
  profile: ProfileDTO;
  pin: string;
  error: string | null;
  isPending: boolean;
  onPinChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Enter PIN for ${profile.name}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-sm rounded-panel border border-line bg-surface p-7"
      >
        <h2 className="text-lg font-bold">Enter PIN</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {profile.name} is locked with a {PROFILE_PIN_LENGTH}-digit PIN.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Input
            value={pin}
            onChange={(event) => onPinChange(event.target.value.replace(/\D/g, '').slice(0, PROFILE_PIN_LENGTH))}
            // `inputMode` gives mobile users a numeric keypad without the
            // spinner arrows `type="number"` would add.
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={PROFILE_PIN_LENGTH}
            aria-label="Profile PIN"
            className="text-center text-2xl tracking-[0.6em]"
            error={error ?? undefined}
          />

          <div className="flex gap-3">
            <Button type="button" variant="outline" block onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" block isLoading={isPending} disabled={pin.length < PROFILE_PIN_LENGTH}>
              Unlock
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
