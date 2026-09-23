import type { ReactNode } from 'react';
import { cn } from '@presentation/lib/cn';

export interface RadioGroupProps {
  readonly legend: string;
  /** For a group whose card title already says what it is. */
  readonly hideLegend?: boolean | undefined;
  readonly className?: string | undefined;
  readonly legendClassName?: string | undefined;
  /** Shown under the options, e.g. the current choice spelled out. */
  readonly footer?: ReactNode | undefined;
  readonly children: ReactNode;
}

/** A fieldset, so screen readers announce the question before each option. */
export function RadioGroup({
  legend,
  hideLegend = false,
  className,
  legendClassName,
  footer,
  children,
}: RadioGroupProps): React.JSX.Element {
  return (
    <fieldset className={cn('flex flex-col gap-[var(--sp-1)]', className)}>
      <legend
        className={cn(
          'text-[length:var(--fs-small)] font-medium text-[var(--text)]',
          hideLegend && 'sr-only',
          legendClassName,
        )}
      >
        {legend}
      </legend>
      <div className="flex flex-wrap gap-x-[var(--sp-5)]">{children}</div>
      {footer}
    </fieldset>
  );
}
