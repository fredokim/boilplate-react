import type { ChatMessage } from '../model/chatMessage';
import type { RealtimeChatAdapter } from './realtimeChatAdapter';

const participants = [
  { userId: 'user-mina', displayName: 'Mina', profileImageUrl: '/avatars/mina.svg' },
  { userId: 'user-jun', displayName: 'Jun', profileImageUrl: '/avatars/jun.svg' },
  { userId: 'user-alex', displayName: 'Alex', profileImageUrl: '/avatars/alex.svg' },
] as const;

const messages = [
  'The stage looks amazing!',
  'That guitar tone is incredible.',
  'Watching from Seoul 👋',
  'This is my favorite song.',
  'The crowd energy is unreal!',
] as const;

export function createMockRealtimeChatAdapter(intervalMs = 1800): RealtimeChatAdapter {
  return {
    connect: ({ onMessage, onStateChange }) => {
      let messageIndex = 0;
      let messageTimer: ReturnType<typeof setInterval> | undefined;

      onStateChange('connecting');
      const connectionTimer = setTimeout(() => {
        onStateChange('connected');
        messageTimer = setInterval(() => {
          const participant = participants[messageIndex % participants.length];
          const message = messages[messageIndex % messages.length];

          if (participant && message) {
            const chatMessage: ChatMessage = {
              id: `mock-${String(Date.now())}-${String(messageIndex)}`,
              userId: participant.userId,
              displayName: participant.displayName,
              profileImageUrl: participant.profileImageUrl,
              message,
              timestamp: new Date().toISOString(),
            };
            onMessage(chatMessage);
          }
          messageIndex += 1;
        }, intervalMs);
      }, 350);

      return () => {
        clearTimeout(connectionTimer);
        if (messageTimer) {
          clearInterval(messageTimer);
        }
      };
    },
  };
}

