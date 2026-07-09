// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePolling } from "./usePolling";

function TestComponent({ enabled, poll }: { enabled: boolean; poll: () => Promise<boolean> }) {
  usePolling(enabled, poll);
  return null;
}

describe("usePolling", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    // React の act 環境フラグ
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const render = (enabled: boolean, poll: () => Promise<boolean>) => {
    act(() => {
      root.render(<TestComponent enabled={enabled} poll={poll} />);
    });
  };

  const advance = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  it("enabled=false では poll しない", async () => {
    const poll = vi.fn(async () => true);
    render(false, poll);
    await advance(120_000);
    expect(poll).not.toHaveBeenCalled();
  });

  it("5s → 10s → 20s と指数バックオフで poll する", async () => {
    const poll = vi.fn(async () => true);
    render(true, poll);
    expect(poll).not.toHaveBeenCalled();
    await advance(5_000);
    expect(poll).toHaveBeenCalledTimes(1);
    await advance(10_000);
    expect(poll).toHaveBeenCalledTimes(2);
    await advance(20_000);
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it("poll が false を返したら停止する", async () => {
    const poll = vi.fn(async () => false);
    render(true, poll);
    await advance(5_000);
    expect(poll).toHaveBeenCalledTimes(1);
    await advance(300_000);
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it("poll が throw しても継続する", async () => {
    const poll = vi.fn(async () => {
      throw new Error("network");
    });
    render(true, poll);
    await advance(5_000);
    await advance(10_000);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it("enabled が false になったら停止する", async () => {
    const poll = vi.fn(async () => true);
    render(true, poll);
    await advance(5_000);
    expect(poll).toHaveBeenCalledTimes(1);
    render(false, poll);
    await advance(300_000);
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it("タブ非表示中はリクエストせず、表示に戻ったら再開する", async () => {
    const poll = vi.fn(async () => true);
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    render(true, poll);
    await advance(30_000);
    expect(poll).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    await advance(5_000);
    expect(poll).toHaveBeenCalledTimes(1);
  });
});
