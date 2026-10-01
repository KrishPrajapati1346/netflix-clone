import { cn, initials } from '@/lib/utils';

/**
 * Bundled avatar set.
 *
 * Gradients rather than illustration files: no assets to ship, no network
 * request, and every profile is visually distinct at a glance from across a
 * room — which is the only job a profile avatar actually has.
 */
const AVATAR_GRADIENTS: Record<string, string> = {
  ember: 'from-[#f0b429] to-[#d97706]',
  aurora: 'from-[#7c5cff] to-[#4338ca]',
  cobalt: 'from-[#38bdf8] to-[#0369a1]',
  moss: 'from-[#4ade80] to-[#15803d]',
  plum: 'from-[#e879f9] to-[#a21caf]',
  sand: 'from-[#fcd34d] to-[#b45309]',
  slate: 'from-[#94a3b8] to-[#334155]',
  coral: 'from-[#fb7185] to-[#be123c]',
};

export const AVATAR_KEYS = Object.keys(AVATAR_GRADIENTS);

export function ProfileAvatar({
  name,
  avatarKey,
  avatarUrl,
  size = 'md',
  className,
}: {
  name: string;
  avatarKey: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const gradient = AVATAR_GRADIENTS[avatarKey] ?? AVATAR_GRADIENTS.ember;

  const sizes = {
    sm: 'size-10 text-sm rounded-lg',
    md: 'size-20 text-2xl rounded-xl',
    lg: 'size-28 text-3xl rounded-2xl sm:size-32',
  } as const;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn('object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-gradient-to-br font-bold text-black/80',
        gradient,
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
