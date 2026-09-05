import { describe, expect, it } from 'vitest';
import { connectionStatus, type ConnectionState } from './connectionStatus';

const ALL: ConnectionState[] = [
  'idle',
  'connecting',
  'connected',
  'reconnecting',
  'suspended',
  'disconnected',
  'error',
];

describe('connectionStatus', () => {
  it('has a sentence for every state', () => {
    // The mapping is a Record, so a missing state is a type error rather than a
    // runtime surprise. This is here for the other direction: a state added to
    // the union and forgotten in this list.
    for (const state of ALL) {
      const status = connectionStatus(state);
      expect(status.label).toBeTruthy();
      expect(['ok', 'busy', 'bad']).toContain(status.tone);
    }
  });

  it('keeps the two states that used to look alike apart', () => {
    // Before `suspended` existed, an idle release and a dropped connection
    // were both `disconnected` and read identically. Distinct wording is the
    // whole point of the state; identical wording would waste it.
    const paused = connectionStatus('suspended');
    const dropped = connectionStatus('disconnected');

    expect(paused.label).not.toBe(dropped.label);
    expect(paused.tone).not.toBe(dropped.tone);
  });

  it('does not dress a deliberate pause as a failure', () => {
    expect(connectionStatus('suspended').tone).toBe('ok');
    expect(connectionStatus('disconnected').tone).toBe('bad');
    expect(connectionStatus('error').tone).toBe('bad');
  });

  it('tells the reader how a paused connection comes back', () => {
    // Nothing is broken and no button restores it, so the one state whose
    // recovery is invisible is the one that has to say so.
    expect(connectionStatus('suspended').detail).toMatch(/interact/i);
  });

  it('says nothing extra where there is nothing to say', () => {
    expect(connectionStatus('connected').detail).toBeUndefined();
    expect(connectionStatus('idle').detail).toBeUndefined();
  });
});
