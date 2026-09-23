import { cn } from '@presentation/lib/cn';

/**
 * One look for every text-like control (input, textarea, native select), so a field on the
 * roster page matches a field on the new-match page. Callers only adjust width.
 */
export const FIELD_CLASSES = cn(
  'min-h-[var(--hit-min)] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)]',
  'bg-[var(--surface)] px-[var(--sp-3)] text-[length:var(--fs-body)] text-[var(--text)]',
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2',
  'focus-visible:outline-[var(--focus-ring)]',
  'aria-[invalid=true]:border-[var(--outcome-error)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

/** Tick box and radio dot: native controls, tinted and sized for a finger. */
export const CHOICE_CLASSES = 'size-5 shrink-0 accent-[var(--accent)]';

/** The whole row is the hit target, never just the 20px control. */
export const CHOICE_ROW_CLASSES =
  'flex min-h-[var(--hit-min)] cursor-pointer items-center gap-[var(--sp-2)] text-[length:var(--fs-body)] text-[var(--text)]';
