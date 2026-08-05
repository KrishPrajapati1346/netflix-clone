import type {
  AuthSessionDTO,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UserDTO,
} from '@kinora/shared';
import { http } from '../api-client';

/**
 * Auth endpoints.
 *
 * Request types are imported from the shared package rather than redeclared, so
 * a change to a server-side schema surfaces here as a compile error instead of
 * a runtime 422.
 */

/** Extra field the API returns only when SMTP is unconfigured outside production. */
export interface DevAssistedSession extends AuthSessionDTO {
  devVerificationUrl?: string;
}

export const authApi = {
  register: (input: RegisterInput) => http.post<DevAssistedSession>('/auth/register', input),

  login: (input: LoginInput) => http.post<AuthSessionDTO>('/auth/login', input),

  refresh: () => http.post<AuthSessionDTO>('/auth/refresh'),

  logout: () => http.post<{ loggedOut: boolean }>('/auth/logout'),

  logoutAll: () => http.post<{ loggedOut: boolean; sessionsRevoked: number }>('/auth/logout-all'),

  me: () => http.get<{ user: UserDTO }>('/auth/me'),

  sessions: () =>
    http.get<{
      sessions: Array<{
        familyId: string;
        userAgent: string | null;
        ip: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('/auth/sessions'),

  verifyEmail: (token: string) => http.post<{ user: UserDTO }>('/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    http.post<{ message: string; devVerificationUrl?: string }>('/auth/resend-verification', {
      email,
    }),

  forgotPassword: (input: ForgotPasswordInput) =>
    http.post<{ message: string; devResetUrl?: string }>('/auth/forgot-password', input),

  resetPassword: (input: ResetPasswordInput) =>
    http.post<AuthSessionDTO>('/auth/reset-password', input),

  changePassword: (input: ChangePasswordInput) =>
    http.post<AuthSessionDTO>('/auth/change-password', input),

  /** Which social buttons this deployment can actually serve. */
  providers: () =>
    http.get<{ google: boolean; github: boolean; emailDelivery: boolean }>('/auth/providers'),
};
