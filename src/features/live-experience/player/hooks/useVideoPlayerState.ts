import { useCallback, useState } from 'react';
import { initialPlayerState, type PlayerError, type PlayerPlaybackState, type PlayerState } from '../model/player';

/** A live manifest reports Infinity, which must not reach the UI as a duration. */
function readDuration(video: HTMLVideoElement) {
  return Number.isFinite(video.duration) ? video.duration : 0;
}

function readSeekable(video: HTMLVideoElement) {
  const { seekable } = video;
  if (seekable.length === 0) return { seekableStart: 0, seekableEnd: 0 };
  return { seekableStart: seekable.start(0), seekableEnd: seekable.end(seekable.length - 1) };
}

export function useVideoPlayerState() {
  const [playerState, setPlayerState] = useState<PlayerState>(initialPlayerState);

  const setPlaybackState = useCallback((playbackState: PlayerPlaybackState) => {
    setPlayerState((current) => ({ ...current, playbackState }));
  }, []);

  const setError = useCallback((error: PlayerError | null) => {
    setPlayerState((current) => ({
      ...current,
      error,
      playbackState: error ? 'error' : current.playbackState,
    }));
  }, []);

  const updateTiming = useCallback((video: HTMLVideoElement) => {
    setPlayerState((current) => ({
      ...current,
      currentTime: video.currentTime,
      duration: readDuration(video),
      // A stream with no finite duration is live; DVR then shows up as a seekable window.
      isLive: video.duration === Number.POSITIVE_INFINITY,
      ...readSeekable(video),
    }));
  }, []);

  const reset = useCallback(() => setPlayerState(initialPlayerState), []);

  return { playerState, setPlaybackState, setError, updateTiming, reset };
}
