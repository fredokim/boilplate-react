import { describe, expect, it, vi } from 'vitest';
import {
  getDvrWindowSeconds,
  getLatencySeconds,
  initialPlayerState,
  isAtLiveEdge,
  type PlayerState,
} from './model/player';
import { canPlayNativeHls, createNativeEngine } from './engine/playbackEngine';
import { selectEngine } from './engine/selectEngine';

const live = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  ...initialPlayerState,
  isLive: true,
  seekableStart: 100,
  seekableEnd: 400,
  currentTime: 398,
  ...overrides,
});

function videoElement(canPlayHls: boolean) {
  return { canPlayType: () => (canPlayHls ? 'maybe' : '') } as unknown as HTMLVideoElement;
}

describe('live playback maths', () => {
  it('reports no latency for a non-live stream', () => {
    expect(getLatencySeconds({ ...initialPlayerState, currentTime: 10, seekableEnd: 60 })).toBe(0);
  });

  it('measures latency from the seekable end', () => {
    expect(getLatencySeconds(live({ currentTime: 380 }))).toBe(20);
  });

  it('never reports negative latency when playback overruns the seekable end', () => {
    expect(getLatencySeconds(live({ currentTime: 410 }))).toBe(0);
  });

  it('treats a small gap as the live edge and a large one as behind', () => {
    expect(isAtLiveEdge(live({ currentTime: 398 }))).toBe(true);
    expect(isAtLiveEdge(live({ currentTime: 380 }))).toBe(false);
  });

  it('never claims the live edge on a non-live stream', () => {
    expect(isAtLiveEdge({ ...initialPlayerState, seekableEnd: 60, currentTime: 60 })).toBe(false);
  });

  it('reports the DVR window from the seekable range', () => {
    expect(getDvrWindowSeconds(live())).toBe(300);
  });
});

describe('engine selection', () => {
  it('detects native HLS support', () => {
    expect(canPlayNativeHls(videoElement(true))).toBe(true);
    expect(canPlayNativeHls(videoElement(false))).toBe(false);
  });

  it('uses the native engine for progressive sources even without HLS support', () => {
    const choice = selectEngine(videoElement(false), {
      kind: 'progressive',
      src: '/clip.mp4',
      mimeType: 'video/mp4',
    });

    expect(choice.name).toBe('native');
  });

  it('uses the native engine for HLS when the browser plays it directly', () => {
    const hlsJs = vi.fn();
    const choice = selectEngine(videoElement(true), { kind: 'hls', src: '/live.m3u8' }, { hlsJs });

    expect(choice.name).toBe('native');
    expect(hlsJs).not.toHaveBeenCalled();
  });

  it('falls back to hls.js only where native HLS is missing', () => {
    const engine = createNativeEngine();
    const hlsJs = vi.fn(() => engine);
    const choice = selectEngine(videoElement(false), { kind: 'hls', src: '/live.m3u8' }, { hlsJs });

    expect(choice.name).toBe('hls.js');
    expect(hlsJs).toHaveBeenCalledTimes(1);
  });

  it('refuses an HLS source with no way to play it', () => {
    expect(() => selectEngine(videoElement(false), { kind: 'hls', src: '/live.m3u8' }, {})).toThrow(
      'needs an hls.js engine factory',
    );
  });
});
