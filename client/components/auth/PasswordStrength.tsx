'use client';

import { scorePassword } from '@kinora/shared';
import { cn } from '@/lib/utils';

/**
 * Password strength meter.
 *
 * The scoring function lives in the shared package alongside the Zod policy the
 * server enforces, so the meter cannot say "Strong" about a password the API
 * will reject.
 */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const { score, label } = scorePassword(password);

  const barColors = [
    'bg-danger',
    'bg-danger',
    'bg-warning',
    'bg-info',
    'bg-success',
  ] as const;

  return (
    <div className="mt-2">
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              index < score ? barColors[score] : 'bg-line',
            )}
          />
        ))}
      </div>
      {/* The bars are decorative; this line carries the meaning for everyone. */}
      <p className="mt-1.5 text-xs text-fg-subtle" aria-live="polite">
        Password strength: <span className="font-medium text-fg-muted">{label}</span>
      </p>
    </div>
  );
}
