/**
 * Closes a realtime connection that nobody is watching, and reopens it when
 * somebody is.
 *
 * An open WebSocket is continuous inbound traffic. A host that suspends idle
 * instances therefore never suspends one while a single forgotten tab holds a
 * socket open: the tab costs the same as a tab in active use, all night. The
 * spin-down is the whole economics of a free instance, and a socket quietly
 * opts out of it.
 *
 * Two timeouts rather than one, because "nobody is watching" has two shapes:
 *
 * - The tab is hidden. Nobody is watching by definition, and the only event that
 *   can arrive is the one that says it became visible again. A minute is
 *   generous.
 * - The tab is visible and untouched. Somebody may well be reading it, so this
 *   waits much longer; the cost of being wrong is a visible reconnect.
 *
 * Resuming is driven by real input rather than a poll, so the connection comes
 * back on the same gesture that means someone returned.
 */
export type IdleSuspensionOptions = {
  /** Called when the connection should be dropped. */
  onIdle: () => void;
  /** Called on the first sign of activity after `onIdle`. */
  onResume: () => void;
  /** How long a hidden document may hold the connection. */
  hiddenIdleMs?: number;
  /** How long a visible but untouched document may hold it. */
  visibleIdleMs?: number;
  /** Injected in tests. */
  doc?: Document;
  win?: Window;
};

export const DEFAULT_HIDDEN_IDLE_MS = 60_000;
export const DEFAULT_VISIBLE_IDLE_MS = 900_000;

/**
 * `scroll` and `pointermove` are deliberately absent from the resume events.
 *
 * They fire without a person: smooth-scroll animations, a pointer that moves
 * because the page shifted under it. Resuming costs a reconnect and a snapshot
 * refetch, so it takes an event that means somebody did something.
 */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export function watchForIdle(options: IdleSuspensionOptions): () => void {
  const doc = options.doc ?? document;
  const win = options.win ?? window;
  const hiddenIdleMs = options.hiddenIdleMs ?? DEFAULT_HIDDEN_IDLE_MS;
  const visibleIdleMs = options.visibleIdleMs ?? DEFAULT_VISIBLE_IDLE_MS;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let idle = false;
  let stopped = false;

  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const arm = () => {
    clear();
    if (stopped || idle) return;
    timer = setTimeout(() => {
      timer = null;
      idle = true;
      options.onIdle();
    }, doc.hidden ? hiddenIdleMs : visibleIdleMs);
  };

  const activity = () => {
    if (stopped) return;
    if (idle) {
      idle = false;
      options.onResume();
    }
    arm();
  };

  /**
   * Becoming hidden re-arms with the shorter timeout rather than counting as
   * activity: switching away from a tab is a reason to start the clock, not to
   * reset it.
   */
  const onVisibility = () => {
    if (stopped) return;
    if (doc.hidden) {
      arm();
      return;
    }
    activity();
  };

  doc.addEventListener('visibilitychange', onVisibility);
  ACTIVITY_EVENTS.forEach((name) => win.addEventListener(name, activity, { passive: true }));
  win.addEventListener('focus', activity);

  arm();

  return () => {
    stopped = true;
    clear();
    doc.removeEventListener('visibilitychange', onVisibility);
    ACTIVITY_EVENTS.forEach((name) => win.removeEventListener(name, activity));
    win.removeEventListener('focus', activity);
  };
}
