import { useState } from 'react';
import type { PlayerPlaybackState, PlayerState } from '../model/player';

const initialState: PlayerState = {
  playbackState: 'idle',
  currentTime: 0,
  duration: 0,
};

export function useVideoPlayerState() {
  const [playerState, setPlayerState] = useState(initialState);

  const setPlaybackState = (playbackState: PlayerPlaybackState) => {
    setPlayerState((currentState) => ({ ...currentState, playbackState }));
  };

  const updateTiming = (video: HTMLVideoElement) => {
    setPlayerState((currentState) => ({
      ...currentState,
      currentTime: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
    }));
  };

  return { playerState, setPlaybackState, updateTiming };
}

