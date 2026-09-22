import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { COMMON_BUTTONS, COMMON_STATES } from '@shared/copy';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly detail: string;
}

/** Last line of defence: a render crash must never cost the operator the current match. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, detail: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local logging only: nothing is sent anywhere.
    console.error('Errore di rendering', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="m-[var(--sp-6)] rounded-[var(--radius-lg)] border border-[var(--outcome-error)] bg-[var(--surface)] p-[var(--sp-6)]">
        <h1 className="mb-[var(--sp-3)] text-[var(--fs-h2)] font-bold">
          {COMMON_STATES.unexpectedError}
        </h1>
        <p className="mb-[var(--sp-4)] text-[var(--text-muted)]">
          {COMMON_STATES.unexpectedErrorBody}
        </p>
        <pre className="mb-[var(--sp-4)] overflow-auto rounded-[var(--radius-md)] bg-[var(--surface-2)] p-[var(--sp-3)] text-[var(--fs-small)]">
          {this.state.detail}
        </pre>
        <button
          type="button"
          className="min-h-[var(--hit-min)] rounded-[var(--radius-md)] border border-[var(--border-strong)] px-[var(--sp-4)]"
          onClick={() => {
            window.location.reload();
          }}
        >
          {COMMON_BUTTONS.retry}
        </button>
      </div>
    );
  }
}
