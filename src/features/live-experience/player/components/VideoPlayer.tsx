import { useEffect, useRef, useState } from 'react';
import {
  getDvrWindowSeconds,
  getLatencySeconds,
  isAtLiveEdge,
  type VideoSource,
} from '../model/player';
import { createHlsJsEngine } from '../engine/hlsJsEngine';
import { selectEngine, type EngineFactories } from '../engine/selectEngine';
import type { PlaybackEngine } from '../engine/playbackEngine';
import { useVideoPlayerState } from '../hooks/useVideoPlayerState';

type VideoPlayerProps = {
  source: VideoSource;
  title: string;
  /** Injected in tests so no real media element or hls.js download is needed. */
  engineFactories?: EngineFactories;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes)}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function VideoPlayer({ engineFactories, source, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<PlaybackEngine | null>(null);
  const [engineName, setEngineName] = useState<string>('none');
  const { playerState, reset, setError, setPlaybackState, updateTiming } = useVideoPlayerState();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    reset();
    let cancelled = false;

    const choice = selectEngine(video, source, { hlsJs: createHlsJsEngine, ...engineFactories });
    engineRef.current = choice.engine;
    setEngineName(choice.name);

    void choice.engine
      .attach(video, source, { onError: (error) => !cancelled && setError(error) })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError({
          kind: 'unknown',
          message: reason instanceof Error ? reason.message : 'Playback could not start.',
          recoverable: false,
        });
      });

    return () => {
      cancelled = true;
      choice.engine.detach();
      engineRef.current = null;
    };
  }, [engineFactories, reset, setError, source]);

  const latency = getLatencySeconds(playerState);
  const dvrWindow = getDvrWindowSeconds(playerState);
  const atLiveEdge = isAtLiveEdge(playerState);

  const seekToLive = () => {
    const video = videoRef.current;
    if (!video || !playerState.isLive) return;
    video.currentTime = playerState.seekableEnd;
    void video.play().catch(() => undefined);
  };

  const retry = () => {
    if (!engineRef.current?.recover()) return;
    setError(null);
    setPlaybackState('loading');
  };

  return (
    <section className="video-player" aria-label="Video player">
      <div className="video-player__viewport">
        <video
          className="video-player__media"
          controls
          onCanPlay={() => setPlaybackState('paused')}
          onEnded={() => setPlaybackState('ended')}
          onError={() =>
            setError({ kind: 'media', message: 'The media element reported an error.', recoverable: true })
          }
          onLoadStart={() => setPlaybackState('loading')}
          onLoadedMetadata={(event) => updateTiming(event.currentTarget)}
          onPause={() => setPlaybackState('paused')}
          onPlay={() => setPlaybackState('playing')}
          onProgress={(event) => updateTiming(event.currentTarget)}
          onTimeUpdate={(event) => updateTiming(event.currentTarget)}
          onWaiting={() => setPlaybackState('buffering')}
          playsInline
          preload="metadata"
          ref={videoRef}
        >
          {source.kind === 'progressive' ? <source src={source.src} type={source.mimeType} /> : null}
        </video>

        {playerState.isLive ? (
          <button
            aria-label={atLiveEdge ? 'Playing live' : 'Jump to live'}
            className={`video-player__live ${atLiveEdge ? 'video-player__live--edge' : ''}`}
            disabled={atLiveEdge}
            onClick={seekToLive}
            type="button"
          >
            <span className="video-player__live-dot" aria-hidden="true" />
            {atLiveEdge ? 'LIVE' : `${formatTime(latency)} behind`}
          </button>
        ) : null}
      </div>

      <div className="video-player__details">
        <div>
          <h2 className="m-0 text-lg font-bold text-ink">{title}</h2>
          <p className="mb-0 mt-1 text-sm text-muted">
            {playerState.isLive
              ? `Live stream · ${formatTime(dvrWindow)} of DVR available`
              : 'Progressive source · seekable end to end'}
          </p>
        </div>
        <div className="video-player__debug" aria-label="Player debug information">
          <span>{playerState.playbackState}</span>
          <span>{engineName}</span>
          <span>
            {playerState.isLive
              ? `-${formatTime(latency)}`
              : `${formatTime(playerState.currentTime)} / ${formatTime(playerState.duration)}`}
          </span>
        </div>
      </div>

      {playerState.error ? (
        <div className="video-player__error" role="alert">
          <span>{playerState.error.message}</span>
          {playerState.error.recoverable ? (
            <button className="video-player__retry" onClick={retry} type="button">
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
