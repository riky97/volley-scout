import type { ButtonHTMLAttributes, Ref, ReactNode } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large' | 'live';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  readonly ref?: Ref<HTMLButtonElement>;
  readonly children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] hover:brightness-110',
  secondary:
    'bg-[var(--surface)] text-[var(--text)] border-[var(--border-strong)] hover:bg-[var(--surface-2)]',
  ghost:
    'bg-transparent text-[var(--text)] border-transparent hover:bg-[var(--surface-2)]',
  danger:
    'bg-[var(--outcome-error)] text-[var(--on-outcome)] border-[var(--outcome-error)] hover:brightness-110',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  small: 'min-h-[36px] px-3 text-[var(--fs-small)]',
  medium: 'min-h-[var(--hit-min)] px-4 text-[var(--fs-body)]',
  large: 'min-h-[52px] px-6 text-[var(--fs-body-lg)]',
  live: 'min-h-[var(--hit-live)] px-5 text-[var(--fs-body-lg)] font-semibold',
};

export function Button({
  variant = 'secondary',
  size = 'medium',
  fullWidth = false,
  ref,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border',
        'font-medium transition-[background-color,filter] disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
