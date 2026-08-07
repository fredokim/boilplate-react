import type { ChatMessage } from '../chat/model/chatMessage';
import type { RealtimeConnectionState } from '../chat/realtime/realtimeChatAdapter';
import { RealtimeChat } from '../chat/components/RealtimeChat';
import type { VideoSource } from '../player/model/player';
import { VideoPlayer } from '../player/components/VideoPlayer';
import './liveExperience.scss';

type LiveExperienceViewProps = {
  chatMessages: readonly ChatMessage[];
  connectionState: RealtimeConnectionState;
  videoSource: VideoSource;
};

export function LiveExperienceView({ chatMessages, connectionState, videoSource }: LiveExperienceViewProps) {
  return (
    <div className="page-grid">
      <div className="page-heading">
        <div>
          <h1 className="m-0 text-2xl font-black text-ink">Live Streaming Lab</h1>
          <p className="mt-2 text-sm text-muted">A baseline for measuring streaming and realtime rendering behavior.</p>
        </div>
      </div>
      <div className="live-experience">
        <VideoPlayer source={videoSource} title="Summer Stage · Live rehearsal" />
        <RealtimeChat connectionState={connectionState} messages={chatMessages} />
      </div>
    </div>
  );
}

