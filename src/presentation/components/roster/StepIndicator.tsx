import clsx from 'clsx';

export interface StepIndicatorProps {
  readonly steps: readonly string[];
  /** 0-based index of the active step. */
  readonly current: number;
}

/** Tailwind-only progress indicator for the three-step "Nuova partita" flow. */
export function StepIndicator({ steps, current }: StepIndicatorProps): React.JSX.Element {
  return (
    <ol className="flex flex-wrap items-center gap-x-[var(--sp-3)] gap-y-[var(--sp-2)]">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-[var(--sp-2)]">
          <span
            aria-hidden="true"
            className={clsx(
              'h-2 w-8 rounded-[var(--radius-full)]',
              index <= current ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]',
            )}
          />
          <span
            className={clsx(
              'text-[var(--fs-small)]',
              index === current
                ? 'font-semibold text-[var(--text)]'
                : 'text-[var(--text-muted)]',
            )}
            aria-current={index === current ? 'step' : undefined}
          >
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}
