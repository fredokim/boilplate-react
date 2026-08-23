import type { VideoSource } from './player';

/**
 * A progressive file by default, so the lab needs no streaming origin. Point the
 * container at the HLS source to exercise the live path: the player uses native
 * playback on Safari and lazy-loads hls.js everywhere else.
 */
export const progressiveDemoSource: VideoSource = {
  kind: 'progressive',
  src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  mimeType: 'video/mp4',
};

export const liveHlsDemoSource: VideoSource = {
  kind: 'hls',
  src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  lowLatency: true,
};
