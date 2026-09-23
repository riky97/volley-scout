import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface FormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly error?: string | undefined;
  readonly required?: boolean;
  readonly hint?: string | undefined;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Labelled wrapper for a single form control: associates the label, an optional hint and an
 * inline validation error via `aria-describedby`, so screen readers announce both.
 */
export function FormField({
  id,
  label,
  error,
  required = false,
  hint,
  className,
  children,
}: FormFieldProps): React.JSX.Element {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={clsx('flex flex-col gap-[var(--sp-1)]', className)}>
      <label htmlFor={id} className="text-[var(--fs-small)] font-medium text-[var(--text)]">
        {label}
        {required && (
          <span aria-hidden="true" className="text-[var(--outcome-error)]">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint !== undefined && (
        <p id={hintId} className="text-[var(--fs-small)] text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-[var(--fs-small)] text-[var(--outcome-error)]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Builds the `aria-describedby` value matching `FormField`'s hint/error element ids. */
export function describedBy(
  id: string,
  state: { readonly hint?: string | undefined; readonly error?: string | undefined },
): string | undefined {
  const ids: string[] = [];
  if (state.hint !== undefined) ids.push(`${id}-hint`);
  if (state.error !== undefined) ids.push(`${id}-error`);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

/** Shared Tailwind classes for a text/number/date input matching the design tokens. */
export const TEXT_INPUT_CLASSES = clsx(
  'min-h-[var(--hit-min)] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)]',
  'bg-[var(--surface)] px-[var(--sp-3)] text-[var(--fs-body)] text-[var(--text)]',
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2',
  'focus-visible:outline-[var(--focus-ring)]',
);
