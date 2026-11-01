import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNotifier } from "./notifier";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(wait = 100, maxWait?: number) {
  const call = vi.fn();
  const waiting = vi.fn();
  const notifier = createNotifier<string>("start", call, waiting);
  notifier.configure({ wait, maxWait });
  return { notifier, call, waiting };
}

describe("createNotifier", () => {
  it("does not call for the page the host already has", () => {
    const { notifier, call } = setup();
    notifier.push("start");
    vi.advanceTimersByTime(1000);
    expect(call).not.toHaveBeenCalled();
  });

  it("calls once, with the latest page, after the delay", () => {
    const { notifier, call } = setup();
    notifier.push("a");
    vi.advanceTimersByTime(60);
    notifier.push("b");
    vi.advanceTimersByTime(60);
    expect(call).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40);
    expect(call.mock.calls).toEqual([["b"]]);
  });

  it("does not call again for a page it was already given", () => {
    const { notifier, call } = setup();
    notifier.push("a");
    vi.advanceTimersByTime(200);
    notifier.push("a");
    vi.advanceTimersByTime(200);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("says a change waits, and that it does not any more once it was called", () => {
    const { notifier, waiting } = setup();
    notifier.push("a");
    expect(waiting).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(100);
    expect(waiting).toHaveBeenLastCalledWith(false);
  });

  it("calls at once, for each page, without a delay", () => {
    const { notifier, call, waiting } = setup(0);
    notifier.push("a");
    notifier.push("b");
    expect(call.mock.calls).toEqual([["a"], ["b"]]);
    expect(waiting).toHaveBeenLastCalledWith(false);
  });

  it("calls in the middle of a run of changes when there is a longest wait", () => {
    const { notifier, call } = setup(100, 250);
    for (let at = 0; at < 600; at += 50) {
      notifier.push(`page ${at}`);
      vi.advanceTimersByTime(50);
    }
    expect(call.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("calls what waits when it is flushed, and only if something waits", () => {
    const { notifier, call } = setup();
    notifier.flush();
    expect(call).not.toHaveBeenCalled();
    notifier.push("a");
    notifier.flush();
    expect(call.mock.calls).toEqual([["a"]]);
    vi.advanceTimersByTime(500);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("calls what waited with the old delay before it takes a new one", () => {
    const { notifier, call } = setup(1000);
    notifier.push("a");
    notifier.configure({ wait: 10 });
    expect(call.mock.calls).toEqual([["a"]]);
    notifier.push("b");
    vi.advanceTimersByTime(10);
    expect(call.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("is not called twice when the editor is set up, shut and set up again", () => {
    const { notifier, call } = setup();
    notifier.push("a");
    notifier.flush();
    notifier.configure({ wait: 100 });
    notifier.push("a");
    vi.advanceTimersByTime(500);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("remembers the page the host has when the delay changes", () => {
    const { notifier, call } = setup();
    notifier.push("a");
    notifier.flush();
    notifier.configure({ wait: 50 });
    notifier.push("a");
    vi.advanceTimersByTime(500);
    expect(call).toHaveBeenCalledTimes(1);
  });
});
