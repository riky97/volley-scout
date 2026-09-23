import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@presentation/lib/cn';
import { CHOICE_CLASSES, CHOICE_ROW_CLASSES } from './fieldStyles';

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  /** Visible label; the whole row toggles the box. */
  readonly children: ReactNode;
  readonly rowClassName?: string | undefined;
}

/** Native checkbox inside its label row. Accepts `register()` and controlled props alike. */
export function Checkbox({ children, className, rowClassName, ...props }: CheckboxProps): React.JSX.Element {
  return (
    <label className={cn(CHOICE_ROW_CLASSES, rowClassName)}>
      <input type="checkbox" className={cn(CHOICE_CLASSES, className)} {...props} />
      {children}
    </label>
  );
}
