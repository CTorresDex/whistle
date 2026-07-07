import { describe, expect, test } from "bun:test";
import { RetryGuard } from "../../src/retry-guard";

describe("RetryGuard (login guard: max-retries 5, refresh-time 1h)", () => {
  test("blocks after 5 failures for the same key", () => {
    const guard = new RetryGuard(5, 1000);
    for (let i = 0; i < 4; i++) guard.recordFailure("ip1");
    expect(guard.isBlocked("ip1")).toBe(false);
    guard.recordFailure("ip1");
    expect(guard.isBlocked("ip1")).toBe(true);
    expect(guard.isBlocked("ip2")).toBe(false);
  });

  test("resets after the refresh time elapses", () => {
    let now = 0;
    const guard = new RetryGuard(5, 1000, () => now);
    for (let i = 0; i < 5; i++) guard.recordFailure("ip1");
    expect(guard.isBlocked("ip1")).toBe(true);
    now = 1001;
    expect(guard.isBlocked("ip1")).toBe(false);
  });

  test("clear removes the counter", () => {
    const guard = new RetryGuard(5, 1000);
    for (let i = 0; i < 5; i++) guard.recordFailure("ip1");
    guard.clear("ip1");
    expect(guard.isBlocked("ip1")).toBe(false);
  });
});
