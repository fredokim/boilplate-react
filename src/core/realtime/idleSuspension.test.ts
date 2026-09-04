import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HIDDEN_IDLE_MS, DEFAULT_VISIBLE_IDLE_MS, watchForIdle } from './idleSuspension';

/**
 * jsdom's `document.hidden` is a getter on the prototype, so it is redefined
 * rather than assigned.
 */
function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('watchForIdle', () => {
  let onIdle: ReturnType<typeof vi.fn<() => void>>;
  let onResume: ReturnType<typeof vi.fn<() => void>>;
  let stop: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    onIdle = vi.fn<() => void>();
    onResume = vi.fn<() => void>();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  afterEach(() => {
    stop?.();
    stop = null;
    vi.useRealTimers();
  });

  it('drops a hidden document a minute after it is hidden, not fifteen', () => {
    stop = watchForIdle({ onIdle, onResume });

    setHidden(true);
    vi.advanceTimersByTime(DEFAULT_HIDDEN_IDLE_MS - 1);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('gives a visible document much longer, because someone may be reading it', () => {
    stop = watchForIdle({ onIdle, onResume });

    vi.advanceTimersByTime(DEFAULT_HIDDEN_IDLE_MS * 5);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DEFAULT_VISIBLE_IDLE_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resumes on the gesture that means someone came back', () => {
    stop = watchForIdle({ onIdle, onResume });

    vi.advanceTimersByTime(DEFAULT_VISIBLE_IDLE_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('keydown'));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('resumes when a hidden tab is looked at again', () => {
    stop = watchForIdle({ onIdle, onResume });

    setHidden(true);
    vi.advanceTimersByTime(DEFAULT_HIDDEN_IDLE_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);

    setHidden(false);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('does not resume on activity while still connected', () => {
    stop = watchForIdle({ onIdle, onResume });

    window.dispatchEvent(new Event('keydown'));
    expect(onResume).not.toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('restarts the clock on activity, so a used tab is never dropped', () => {
    stop = watchForIdle({ onIdle, onResume });

    for (let i = 0; i < 5; i += 1) {
      vi.advanceTimersByTime(DEFAULT_VISIBLE_IDLE_MS - 1);
      window.dispatchEvent(new Event('pointerdown'));
    }

    expect(onIdle).not.toHaveBeenCalled();
  });

  it('starts the shorter clock when the tab is hidden rather than resetting it', () => {
    stop = watchForIdle({ onIdle, onResume });

    // Most of the visible budget is already gone; hiding must not buy a full
    // fifteen minutes more.
    vi.advanceTimersByTime(DEFAULT_VISIBLE_IDLE_MS - 1);
    setHidden(true);

    vi.advanceTimersByTime(DEFAULT_HIDDEN_IDLE_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('stops listening once torn down', () => {
    const teardown = watchForIdle({ onIdle, onResume });
    teardown();

    vi.advanceTimersByTime(DEFAULT_VISIBLE_IDLE_MS * 2);
    window.dispatchEvent(new Event('keydown'));

    expect(onIdle).not.toHaveBeenCalled();
    expect(onResume).not.toHaveBeenCalled();
  });
});
