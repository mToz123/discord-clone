'use client';

import { useEffect, useState } from 'react';
import { socketClient } from '@/lib/socket';

interface TypingIndicatorProps {
  channelId: string;
  currentUserId: string;
}

export function TypingIndicator({ channelId, currentUserId }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; timeout: NodeJS.Timeout }>>(new Map());

  useEffect(() => {
    const handleTypingStart = (data: { userId: string; username: string; channelId: string }) => {
      if (data.channelId !== channelId || data.userId === currentUserId) return;

      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        
        // Clear existing timeout
        const existing = newMap.get(data.userId);
        if (existing?.timeout) {
          clearTimeout(existing.timeout);
        }

        // Set new timeout (auto-remove after 5 seconds)
        const timeout = setTimeout(() => {
          setTypingUsers((current) => {
            const updated = new Map(current);
            updated.delete(data.userId);
            return updated;
          });
        }, 5000);

        newMap.set(data.userId, { username: data.username, timeout });
        return newMap;
      });
    };

    const handleTypingStop = (data: { userId: string; channelId: string }) => {
      if (data.channelId !== channelId) return;

      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.userId);
        if (existing?.timeout) {
          clearTimeout(existing.timeout);
        }
        newMap.delete(data.userId);
        return newMap;
      });
    };

    socketClient.getSocket()?.on('typing:start', handleTypingStart);
    socketClient.getSocket()?.on('typing:stop', handleTypingStop);

    return () => {
      socketClient.off('typing:start', handleTypingStart);
      socketClient.off('typing:stop', handleTypingStop);
      
      // Clear all timeouts
      typingUsers.forEach((user) => {
        if (user.timeout) clearTimeout(user.timeout);
      });
    };
  }, [channelId, currentUserId]);

  if (typingUsers.size === 0) return null;

  const usernames = Array.from(typingUsers.values()).map((u) => u.username);
  
  let text = '';
  if (usernames.length === 1) {
    text = `${usernames[0]} is typing...`;
  } else if (usernames.length === 2) {
    text = `${usernames[0]} and ${usernames[1]} are typing...`;
  } else if (usernames.length === 3) {
    text = `${usernames[0]}, ${usernames[1]}, and ${usernames[2]} are typing...`;
  } else {
    text = `Several people are typing...`;
  }

  return (
    <div className="px-4 py-1 text-sm text-gray-400 flex items-center space-x-1">
      <span>{text}</span>
      <span className="flex space-x-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </div>
  );
}
