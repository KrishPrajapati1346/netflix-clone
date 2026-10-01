'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ProfileDTO } from '@shared';
import { profileApi } from '@/lib/api/profiles';
import { getProfileGrant, setProfileGrant, toApiError } from '@/lib/api-client';
import { useAuth } from '@/context/AuthProvider';

interface ProfileContextValue {
  activeProfile: ProfileDTO | null;
  isLoading: boolean;
  /** Unlocks a profile (satisfying its PIN if set) and makes it active. */
  selectProfile: (profileId: string, pin?: string) => Promise<ProfileDTO>;
  clearProfile: () => Promise<void>;
  /** Re-reads the active profile after an edit so preferences stay in sync. */
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Tracks which profile the session is acting as.
 *
 * The grant lives in sessionStorage and is replayed on every request by the
 * Axios interceptor. This provider's job is to restore it after a reload and to
 * clear it whenever the account changes — without that, signing out and back in
 * as someone else would leave the previous account's grant attached, and every
 * profile-scoped request would fail confusingly rather than showing the picker.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [activeProfile, setActiveProfile] = useState<ProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Restore the active profile once the session is known.
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    /*
      Every branch resolves asynchronously, including the trivial ones. Setting
      state synchronously in an effect body triggers a cascading render, and
      having one branch behave differently from the others is exactly how that
      gets reintroduced later.
    */
    (async () => {
      if (!isAuthenticated) {
        await Promise.resolve();
        if (!cancelled) {
          setActiveProfile(null);
          setIsLoading(false);
        }
        return;
      }

      if (!getProfileGrant()) {
        // No grant: the picker is the correct next screen, not an error.
        await Promise.resolve();
        if (!cancelled) {
          setActiveProfile(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { profile } = await profileApi.active();
        if (!cancelled) setActiveProfile(profile);
      } catch {
        // Grant expired, revoked, or belongs to a different account.
        setProfileGrant(null);
        if (!cancelled) setActiveProfile(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.id]);

  const selectProfile = useCallback(
    async (profileId: string, pin?: string) => {
      try {
        const { profile, profileToken } = await profileApi.select(profileId, pin);
        setProfileGrant(profileToken);
        setActiveProfile(profile);

        // Every cached query was fetched as the previous profile. Dropping the
        // cache is what makes switching profiles show a genuinely different
        // home page instead of the last one until each query refetches.
        await queryClient.resetQueries();
        return profile;
      } catch (error) {
        throw toApiError(error);
      }
    },
    [queryClient],
  );

  const clearProfile = useCallback(async () => {
    setProfileGrant(null);
    setActiveProfile(null);
    await queryClient.resetQueries();
    await profileApi.clear().catch(() => undefined);
    router.push('/profiles');
  }, [queryClient, router]);

  const refreshProfile = useCallback(async () => {
    if (!getProfileGrant()) return;
    try {
      const { profile } = await profileApi.active();
      setActiveProfile(profile);
    } catch {
      setProfileGrant(null);
      setActiveProfile(null);
    }
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ activeProfile, isLoading, selectProfile, clearProfile, refreshProfile }),
    [activeProfile, isLoading, selectProfile, clearProfile, refreshProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
}
