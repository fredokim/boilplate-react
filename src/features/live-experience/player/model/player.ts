export type VideoSource = {
  kind: 'progressive';
  src: string;
  mimeType: string;
};

export type PlayerPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';

export type PlayerState = {
  playbackState: PlayerPlaybackState;
  currentTime: number;
  duration: number;
};

