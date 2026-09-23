import type { ReactNode } from 'react';
import { cn } from '@presentation/lib/cn';
import { Label } from './Label';

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
    <div className={cn('flex flex-col gap-[var(--sp-1)]', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
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
