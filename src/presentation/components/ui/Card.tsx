import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface CardProps {
  readonly title?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Card({ title, actions, className, children }: CardProps): React.JSX.Element {
  return (
    <section
      className={clsx(
        'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]',
        'p-[var(--sp-5)] shadow-[var(--shadow-1)]',
        className,
      )}
    >
      {(title !== undefined || actions !== undefined) && (
        <header className="mb-[var(--sp-4)] flex items-center justify-between gap-[var(--sp-4)]">
          {title !== undefined && (
            <h2 className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">{title}</h2>
          )}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
