import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const tones = {
  danger: {
    icon: AlertCircle,
    className: 'border-danger/40 bg-danger-soft text-danger',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-success/40 bg-success/10 text-success',
  },
  info: {
    icon: Info,
    className: 'border-info/40 bg-info-soft text-info',
  },
} as const;

/**
 * Inline form-level message.
 *
 * `role="alert"` on the danger tone makes failures announce immediately —
 * a submit error that only appears visually is invisible to a screen reader
 * user, who is left wondering why nothing happened.
 */
export function FormAlert({
  tone = 'info',
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = tones[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-sm',
        toneClass,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
