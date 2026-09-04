import type { VideoSource } from '../model/player';
import { canPlayNativeHls, createNativeEngine, type PlaybackEngine } from './playbackEngine';

export type EngineChoice = {
  engine: PlaybackEngine;
  /** Which path was taken, so the debug panel can show it. */
  name: 'native' | 'hls.js';
};

export type EngineFactories = {
  native?: () => PlaybackEngine;
  hlsJs?: () => PlaybackEngine;
};

/**
 * Progressive files and natively supported HLS never load a media-source library.
 * Everything else falls back to hls.js, which is imported lazily inside its engine.
 */
export function selectEngine(video: HTMLVideoElement, source: VideoSource, factories: EngineFactories = {}): EngineChoice {
  const native = factories.native ?? createNativeEngine;

  if (source.kind === 'progressive' || canPlayNativeHls(video)) {
    return { engine: native(), name: 'native' };
  }

  const hlsJs = factories.hlsJs;
  if (!hlsJs) throw new Error('An HLS source needs an hls.js engine factory on this browser.');
  return { engine: hlsJs(), name: 'hls.js' };
}
