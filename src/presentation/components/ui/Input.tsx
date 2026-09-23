import type { ComponentProps } from 'react';
import { cn } from '@presentation/lib/cn';
import { FIELD_CLASSES } from './fieldStyles';

/** Native input (text, number, date, search) with the shared field look. Accepts `register()`. */
export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>): React.JSX.Element {
  return <input type={type} className={cn(FIELD_CLASSES, className)} {...props} />;
}
