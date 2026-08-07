import type { VideoSource } from '../model/player';
import { useVideoPlayerState } from '../hooks/useVideoPlayerState';

type VideoPlayerProps = {
  source: VideoSource;
  title: string;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes)}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function VideoPlayer({ source, title }: VideoPlayerProps) {
  const { playerState, setPlaybackState, updateTiming } = useVideoPlayerState();

  return (
    <section className="video-player" aria-label="Video player">
      <div className="video-player__viewport">
        <video
          className="video-player__media"
          controls
          onCanPlay={() => setPlaybackState('paused')}
          onEnded={() => setPlaybackState('ended')}
          onError={() => setPlaybackState('error')}
          onLoadStart={() => setPlaybackState('loading')}
          onLoadedMetadata={(event) => updateTiming(event.currentTarget)}
          onPause={() => setPlaybackState('paused')}
          onPlay={() => setPlaybackState('playing')}
          onTimeUpdate={(event) => updateTiming(event.currentTarget)}
          onWaiting={() => setPlaybackState('buffering')}
          playsInline
          preload="metadata"
        >
          <source src={source.src} type={source.mimeType} />
        </video>
      </div>
      <div className="video-player__details">
        <div>
          <h2 className="m-0 text-lg font-bold text-ink">{title}</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Progressive test source · HLS integration point prepared</p>
        </div>
        <div className="video-player__debug" aria-label="Player debug information">
          <span>{playerState.playbackState}</span>
          <span>
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </span>
        </div>
      </div>
    </section>
  );
}
