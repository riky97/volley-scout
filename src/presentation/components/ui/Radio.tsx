import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@presentation/lib/cn';
import { CHOICE_CLASSES, CHOICE_ROW_CLASSES } from './fieldStyles';

export interface RadioProps extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  readonly children: ReactNode;
}

/** Native radio inside its label row; group it with `RadioGroup`. */
export function Radio({ children, className, ...props }: RadioProps): React.JSX.Element {
  return (
    <label className={CHOICE_ROW_CLASSES}>
      <input type="radio" className={cn(CHOICE_CLASSES, className)} {...props} />
      {children}
    </label>
  );
}
