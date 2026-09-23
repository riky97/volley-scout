import type { ComponentProps } from 'react';
import { cn } from '@presentation/lib/cn';

export interface LabelProps extends ComponentProps<'label'> {
  readonly required?: boolean | undefined;
}

/** Field caption. The asterisk is visual only: the control itself carries `required`. */
export function Label({ className, required = false, children, ...props }: LabelProps): React.JSX.Element {
  return (
    <label
      className={cn('text-[length:var(--fs-small)] font-medium text-[var(--text)]', className)}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-[var(--outcome-error)]">
          {' '}
          *
        </span>
      )}
    </label>
  );
}
