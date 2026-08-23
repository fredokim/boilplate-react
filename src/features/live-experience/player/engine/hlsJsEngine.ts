import type { PlayerError, VideoSource } from '../model/player';
import type { EngineHandlers, PlaybackEngine } from './playbackEngine';

/** Network and media errors are worth retrying; anything else is terminal. */
const MAX_RECOVERY_ATTEMPTS = 3;

type HlsInstance = {
  loadSource: (src: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
  on: (event: string, handler: (event: string, data: HlsErrorData) => void) => void;
  startLoad: () => void;
  recoverMediaError: () => void;
  destroy: () => void;
};

type HlsErrorData = {
  fatal: boolean;
  type: string;
  details?: string;
};

/**
 * hls.js is loaded on demand and only when the platform has no native HLS, so a browser
 * that can play the stream by itself never downloads it. The light build is used because
 * it still carries low-latency part loading while dropping subtitle rendering, alternate
 * audio switching, and EME, none of which this player surfaces.
 */
export function createHlsJsEngine(): PlaybackEngine {
  let instance: HlsInstance | null = null;
  let recoveryAttempts = 0;
  let lastErrorType: string | null = null;

  return {
    attach: async (video, source: VideoSource, handlers: EngineHandlers) => {
      const module = await import('hls.js/light');
      const Hls = module.default;

      if (!Hls.isSupported()) {
        const error: PlayerError = {
          kind: 'unsupported',
          message: 'This browser cannot play HLS.',
          recoverable: false,
        };
        handlers.onError(error);
        throw new Error(error.message);
      }

      const hls = new Hls({
        lowLatencyMode: source.kind === 'hls' ? (source.lowLatency ?? true) : false,
      }) as unknown as HlsInstance;
      instance = hls;
      recoveryAttempts = 0;

      hls.on('hlsError', (_event, data) => {
        if (!data.fatal) return;
        lastErrorType = data.type;
        const kind: PlayerError['kind'] =
          data.type === 'networkError' ? 'network' : data.type === 'mediaError' ? 'media' : 'unknown';
        handlers.onError({
          kind,
          message: data.details ?? 'Playback failed.',
          recoverable: kind !== 'unknown' && recoveryAttempts < MAX_RECOVERY_ATTEMPTS,
        });
      });

      hls.loadSource(source.src);
      hls.attachMedia(video);
    },

    recover: () => {
      if (!instance || recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) return false;
      recoveryAttempts += 1;
      // Network errors need the loader restarted; media errors need the buffer flushed.
      if (lastErrorType === 'mediaError') instance.recoverMediaError();
      else instance.startLoad();
      return true;
    },

    detach: () => {
      instance?.destroy();
      instance = null;
      recoveryAttempts = 0;
      lastErrorType = null;
    },
  };
}
