export type SaveState = 'idle' | 'pending' | 'saving' | 'error';

/**
 * Serialises writes so two saves can never interleave, and coalesces bursts:
 * only the newest payload is written, and a critical save skips the debounce entirely.
 */
export class SaveQueue<T> {
  private pending: T | null = null;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly write: (payload: T) => Promise<void>,
    private readonly onStateChange: (state: SaveState, error?: unknown) => void,
    private readonly debounceMs = 400,
  ) {}

  /** Writes as soon as possible; used after every rally-terminating or structural event. */
  flushNow(payload: T): void {
    this.pending = payload;
    this.clearTimer();
    void this.drain();
  }

  /** Writes after a short delay; used for low-risk edits such as typing a note. */
  schedule(payload: T): void {
    this.pending = payload;
    this.onStateChange('pending');
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drain();
    }, this.debounceMs);
  }

  /** Resolves once nothing is left to write; used before closing the window. */
  async waitForIdle(): Promise<void> {
    this.clearTimer();
    await this.drain();
  }

  get hasPendingWork(): boolean {
    return this.pending !== null || this.running;
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending !== null) {
        const payload = this.pending;
        this.pending = null;
        this.onStateChange('saving');
        await this.write(payload);
      }
      this.onStateChange('idle');
    } catch (error) {
      this.onStateChange('error', error);
    } finally {
      this.running = false;
    }
  }
}
