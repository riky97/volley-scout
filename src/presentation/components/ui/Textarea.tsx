import type { ComponentProps } from 'react';
import { cn } from '@presentation/lib/cn';
import { FIELD_CLASSES } from './fieldStyles';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>): React.JSX.Element {
  return <textarea className={cn(FIELD_CLASSES, 'py-[var(--sp-2)]', className)} {...props} />;
}
