export type ProgressiveSource = {
  kind: 'progressive';
  src: string;
  mimeType: string;
};

export type HlsSource = {
  kind: 'hls';
  src: string;
  /** Enables LL-HLS part loading where the playlist advertises it. */
  lowLatency?: boolean;
};

export type VideoSource = ProgressiveSource | HlsSource;

export type PlayerPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';

export type PlayerErrorKind = 'network' | 'media' | 'unsupported' | 'unknown';

export type PlayerError = {
  kind: PlayerErrorKind;
  message: string;
  recoverable: boolean;
};

export type PlayerState = {
  playbackState: PlayerPlaybackState;
  currentTime: number;
  /** 0 when unknown, which is what a live stream reports until it ends. */
  duration: number;
  isLive: boolean;
  /** Start of the seekable window. Non-zero on a live stream with DVR. */
  seekableStart: number;
  /** End of the seekable window, which is as close to live as playback can get. */
  seekableEnd: number;
  error: PlayerError | null;
};

export const initialPlayerState: PlayerState = {
  playbackState: 'idle',
  currentTime: 0,
  duration: 0,
  isLive: false,
  seekableStart: 0,
  seekableEnd: 0,
  error: null,
};

/** How far behind the seekable end still counts as 'at the live edge'. */
export const LIVE_EDGE_TOLERANCE_SECONDS = 4;

export function getLatencySeconds(state: PlayerState): number {
  if (!state.isLive) return 0;
  return Math.max(0, state.seekableEnd - state.currentTime);
}

export function isAtLiveEdge(state: PlayerState): boolean {
  return state.isLive && getLatencySeconds(state) <= LIVE_EDGE_TOLERANCE_SECONDS;
}

export function getDvrWindowSeconds(state: PlayerState): number {
  return Math.max(0, state.seekableEnd - state.seekableStart);
}
