// Login guard: discriminator ip, max-retries 5, refresh-time 1h
interface Entry {
  failures: number;
  resetAt: number;
}

export class RetryGuard {
  private entries = new Map<string, Entry>();

  constructor(
    private readonly maxRetries = 5,
    private readonly refreshTimeMs = 60 * 60 * 1000,
    private readonly now: () => number = Date.now,
  ) {}

  private entry(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.resetAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  isBlocked(key: string): boolean {
    const entry = this.entry(key);
    return entry !== undefined && entry.failures >= this.maxRetries;
  }

  recordFailure(key: string): void {
    const entry = this.entry(key);
    if (entry) {
      entry.failures += 1;
    } else {
      this.entries.set(key, { failures: 1, resetAt: this.now() + this.refreshTimeMs });
    }
  }

  clear(key: string): void {
    this.entries.delete(key);
  }
}
