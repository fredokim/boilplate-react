import type { ChatMessage } from '../chat/model/chatMessage';
import type { ChatConnectionState, ChatDiagnostics } from '../chat/realtime/types';
import { RealtimeChat } from '../chat/components/RealtimeChat';
import type { VideoSource } from '../player/model/player';
import { VideoPlayer } from '../player/components/VideoPlayer';
import './liveExperience.scss';

type LiveExperienceViewProps = {
  chatMessages: readonly ChatMessage[];
  chatDiagnostics: ChatDiagnostics;
  connectionState: ChatConnectionState;
  videoSource: VideoSource;
};

export function LiveExperienceView({
  chatDiagnostics,
  chatMessages,
  connectionState,
  videoSource,
}: LiveExperienceViewProps) {
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
        <RealtimeChat connectionState={connectionState} diagnostics={chatDiagnostics} messages={chatMessages} />
      </div>
    </div>
  );
}
