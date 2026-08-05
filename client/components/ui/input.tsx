'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Rendered below the field and wired up via aria-describedby. */
  hint?: ReactNode;
  error?: string;
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
}

/**
 * Text input with a label, hint and error message.
 *
 * The accessibility wiring is the point of this wrapper: the label is bound to
 * the control, errors are announced via `role="alert"`, `aria-invalid` marks the
 * field, and `aria-describedby` links whichever of hint/error is present. Doing
 * this per-form is how it gets forgotten.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, leadingIcon, trailingSlot, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-fg-muted"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leadingIcon && (
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&_svg]:size-4"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'h-11 w-full rounded-control border bg-surface px-3.5 text-sm text-fg',
            'placeholder:text-fg-subtle',
            'transition-colors duration-100',
            'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            'disabled:cursor-not-allowed disabled:opacity-60',
            leadingIcon && 'pl-9',
            trailingSlot && 'pr-11',
            error
              ? 'border-danger'
              : 'border-line hover:border-line-strong',
            className,
          )}
          {...props}
        />

        {trailingSlot && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailingSlot}</span>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
