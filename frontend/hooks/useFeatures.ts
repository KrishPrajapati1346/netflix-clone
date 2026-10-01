'use client';

import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/api-client';

/**
 * What this deployment can actually do.
 *
 * The API reports which optional integrations have credentials, so the UI can
 * hide what it cannot deliver instead of offering a control that fails on
 * click. A clean checkout with an empty `.env` therefore shows no social
 * sign-in buttons and no upload affordances, rather than broken ones.
 *
 * Cached indefinitely: this only changes on redeploy, so refetching it is pure
 * waste.
 */
export interface FeatureFlags {
  email: boolean;
  googleOAuth: boolean;
  githubOAuth: boolean;
  anyOAuth: boolean;
  cloudinary: boolean;
  tmdbIngest: boolean;
  atlasSearch: boolean;
}

const FALLBACK: FeatureFlags = {
  email: false,
  googleOAuth: false,
  githubOAuth: false,
  anyOAuth: false,
  cloudinary: false,
  tmdbIngest: false,
  atlasSearch: false,
};

export function useFeatures(): { features: FeatureFlags; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['features'],
    queryFn: () => http.get<FeatureFlags>('/features'),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  // Falling back to "everything off" means a failed capability lookup hides
  // optional UI rather than rendering controls that cannot work.
  return { features: data ?? FALLBACK, isLoading };
}
