import type { PlayerError, VideoSource } from '../model/player';

export type EngineHandlers = {
  onError: (error: PlayerError) => void;
};

export interface PlaybackEngine {
  /** Points the element at the source. Rejects only when the source cannot be played at all. */
  attach: (video: HTMLVideoElement, source: VideoSource, handlers: EngineHandlers) => Promise<void>;
  /** Attempts to resume after a recoverable error. Returns false when it has given up. */
  recover: () => boolean;
  detach: () => void;
}

export function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

/**
 * Safari and iOS play HLS from a plain src, so they never need a media-source library.
 * Progressive files go through here too — it is the same one-line attach.
 */
export function createNativeEngine(): PlaybackEngine {
  let element: HTMLVideoElement | null = null;

  return {
    attach: async (video, source) => {
      element = video;
      video.src = source.src;
      await Promise.resolve();
    },
    recover: () => {
      // The element retries on its own; re-issuing load is the only lever available.
      element?.load();
      return true;
    },
    detach: () => {
      if (element) element.removeAttribute('src');
      element = null;
    },
  };
}
