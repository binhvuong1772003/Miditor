import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebounce } from "./debounce";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createDebounce", () => {
  it("calls with the latest value once the pushes stop", () => {
    const call = vi.fn();
    const d = createDebounce<number>(call, 100);
    d.push(1);
    vi.advanceTimersByTime(60);
    d.push(2);
    vi.advanceTimersByTime(60);
    expect(call).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith(2);
  });

  it("calls on every push when there is no wait", () => {
    const call = vi.fn();
    const d = createDebounce<number>(call, 0);
    d.push(1);
    d.push(2);
    expect(call.mock.calls).toEqual([[1], [2]]);
    expect(d.pending()).toBe(false);
  });

  it("calls at least every maxWait while the pushes keep coming", () => {
    const call = vi.fn();
    const d = createDebounce<number>(call, 100, 250);
    for (let at = 0; at < 600; at += 50) {
      d.push(at);
      vi.advanceTimersByTime(50);
    }
    expect(call.mock.calls.length).toBeGreaterThanOrEqual(2);
    for (const [value] of call.mock.calls) expect(value).toBeLessThan(600);
  });

  it("makes a call for a value pushed after a call", () => {
    const call = vi.fn();
    const d = createDebounce<string>(call, 50);
    d.push("a");
    vi.advanceTimersByTime(50);
    d.push("b");
    vi.advanceTimersByTime(50);
    expect(call.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("flushes the waiting value at once, and only once", () => {
    const call = vi.fn();
    const d = createDebounce<number>(call, 1000);
    d.push(7);
    expect(d.pending()).toBe(true);
    d.flush();
    d.flush();
    vi.advanceTimersByTime(5000);
    expect(call.mock.calls).toEqual([[7]]);
    expect(d.pending()).toBe(false);
  });

  it("drops the waiting value on cancel", () => {
    const call = vi.fn();
    const d = createDebounce<number>(call, 100);
    d.push(1);
    d.cancel();
    vi.advanceTimersByTime(1000);
    d.flush();
    expect(call).not.toHaveBeenCalled();
    expect(d.pending()).toBe(false);
  });
});
