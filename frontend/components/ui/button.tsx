'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Button.
 *
 * Note the accent variant uses near-black text on saffron rather than white:
 * white on this accent is roughly 2:1 contrast and fails WCAG AA, while
 * near-black clears 8:1.
 */
const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control',
    'font-semibold transition-all duration-200 ease-out-quick',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        accent:
          'bg-accent text-fg-inverse hover:bg-accent-hover active:bg-accent-active active:scale-[0.98]',
        solid:
          'bg-fg text-fg-inverse hover:bg-white active:scale-[0.98]',
        subtle:
          'bg-surface-raised text-fg hover:bg-surface-overlay active:scale-[0.98]',
        outline:
          'border border-line-strong bg-transparent text-fg hover:bg-surface-raised hover:border-fg-subtle',
        ghost: 'bg-transparent text-fg-muted hover:bg-surface-raised hover:text-fg',
        danger: 'bg-danger text-white hover:brightness-110 active:scale-[0.98]',
        link: 'bg-transparent text-accent underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm [&_svg]:size-4',
        md: 'h-11 px-5 text-sm [&_svg]:size-4',
        lg: 'h-12 px-7 text-base [&_svg]:size-5',
        icon: 'size-10 p-0 [&_svg]:size-5',
        'icon-sm': 'size-8 p-0 [&_svg]:size-4',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: { variant: 'accent', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renders as the single child element (e.g. a Next `Link`) instead of a button. */
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild = false, isLoading = false, children, disabled, ...props },
  ref,
) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || isLoading}
      // Tells assistive tech the control is working rather than unresponsive.
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
});

export { buttonVariants };
