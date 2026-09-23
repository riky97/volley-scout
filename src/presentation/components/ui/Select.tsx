import type { ComponentProps } from 'react';
import { cn } from '@presentation/lib/cn';
import { FIELD_CLASSES } from './fieldStyles';

/**
 * Deliberately the browser's own select: on iPad it opens the system picker, which beats any
 * custom menu for a finger. Only the closed control is styled.
 */
export function Select({ className, ...props }: ComponentProps<'select'>): React.JSX.Element {
  return <select className={cn(FIELD_CLASSES, 'w-auto px-[var(--sp-2)]', className)} {...props} />;
}
