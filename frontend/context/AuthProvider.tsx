'use client';

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
import { TOKEN_TTL, type LoginInput, type RegisterInput, type UserDTO } from '@shared';
import { authApi, type DevAssistedSession } from '@/lib/api/auth';
import {
  refreshSession,
  setAccessToken,
  setAuthFailureHandler,
  setProfileGrant,
  toApiError,
} from '@/lib/api-client';

interface AuthContextValue {
  user: UserDTO | null;
  /** True until the initial session restore settles, so guards do not flash. */
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<UserDTO>;
  register: (input: RegisterInput) => Promise<DevAssistedSession>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  /** Applies a session returned by reset-password or the OAuth callback. */
  adoptSession: (accessToken: string, user?: UserDTO) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** Epoch millis at which to renew the access token; null when signed out. */
  const [renewAt, setRenewAt] = useState<number | null>(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setProfileGrant(null);
    setUser(null);
    setRenewAt(null);
  }, []);

  const applySession = useCallback(
    (accessToken: string, nextUser: UserDTO, expiresIn = TOKEN_TTL.accessSeconds) => {
      setAccessToken(accessToken);
      setUser(nextUser);
      // Renew at 80% of the lifetime, with a 60-second floor so a
      // pathologically short TTL cannot turn this into a busy loop.
      setRenewAt(Date.now() + Math.max(60, expiresIn * 0.8) * 1000);
    },
    [],
  );

  /**
   * Renews the access token shortly *before* it expires.
   *
   * Waiting for a 401 also works — the interceptor handles it — but costs the
   * user a visibly failed-then-retried request. Renewing early keeps the token
   * continuously valid throughout an active session.
   *
   * Expressed as state plus an effect rather than a self-calling `setTimeout`:
   * a recursive scheduler has to reference its own binding before it is
   * initialised, and leaves the timer handle as manually-managed cleanup.
   * Re-arming by writing the next deadline to state makes each renewal an
   * ordinary effect run, with React clearing the previous timer for us.
   */
  useEffect(() => {
    if (renewAt === null) return;

    const timer = setTimeout(async () => {
      try {
        const session = await refreshSession();
        setUser(session.user);
        setRenewAt(Date.now() + Math.max(60, session.expiresIn * 0.8) * 1000);
      } catch {
        // The session is gone. Clear locally rather than leaving stale UI that
        // will 401 on the user's next click.
        clearSession();
      }
    }, Math.max(0, renewAt - Date.now()));

    return () => clearTimeout(timer);
  }, [renewAt, clearSession]);

  /**
   * Restores the session on mount.
   *
   * The access token is memory-only, so after a reload there is none — but the
   * httpOnly refresh cookie survives. Trading it for a fresh access token here
   * is what makes "still signed in after refreshing the page" work without ever
   * putting a long-lived credential somewhere script can read it.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await refreshSession();
        if (cancelled) return;
        applySession(session.accessToken, session.user, session.expiresIn);
      } catch {
        // No cookie, or it expired. Anonymous is a valid state, not an error.
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  // The interceptor calls this when a session is unrecoverable (reuse detected,
  // credentials changed), so the UI drops to signed-out immediately.
  useEffect(() => {
    setAuthFailureHandler(() => {
      clearSession();
    });
    return () => setAuthFailureHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      try {
        const session = await authApi.login(input);
        applySession(session.accessToken, session.user, session.expiresIn);
        return session.user;
      } catch (error) {
        throw toApiError(error);
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      try {
        const session = await authApi.register(input);
        applySession(session.accessToken, session.user, session.expiresIn);
        return session;
      } catch (error) {
        throw toApiError(error);
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // A failed logout call must still clear local state — otherwise the UI
      // claims the user is signed in when they asked not to be.
    } finally {
      clearSession();
      router.push('/login');
    }
  }, [clearSession, router]);

  const logoutEverywhere = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } finally {
      clearSession();
      router.push('/login');
    }
  }, [clearSession, router]);

  const adoptSession = useCallback(
    async (accessToken: string, nextUser?: UserDTO) => {
      setAccessToken(accessToken);
      if (nextUser) {
        applySession(accessToken, nextUser);
        return;
      }
      // OAuth hands back only a token; fetch the profile it belongs to.
      const { user: fetched } = await authApi.me();
      applySession(accessToken, fetched);
    },
    [applySession],
  );

  const refreshUser = useCallback(async () => {
    try {
      const { user: fetched } = await authApi.me();
      setUser(fetched);
    } catch (error) {
      throw toApiError(error);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      logoutEverywhere,
      adoptSession,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, logoutEverywhere, adoptSession, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
