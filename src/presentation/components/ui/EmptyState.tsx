import type { ReactNode } from 'react';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-[var(--sp-3)] rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-[var(--sp-7)] text-center">
      <p className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">{title}</p>
      {description !== undefined && (
        <p className="max-w-[46ch] text-[var(--fs-body)] text-[var(--text-muted)]">{description}</p>
      )}
      {action}
    </div>
  );
}

export function LoadingState({ label }: { readonly label: string }): React.JSX.Element {
  return (
    <p className="p-[var(--sp-6)] text-center text-[var(--text-muted)]" role="status">
      {label}
    </p>
  );
}
