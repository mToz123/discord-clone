'use client';

import { useEffect, useRef, useState } from 'react';
import { useMessageStore } from '@/lib/message';
import { MessageReactions } from './MessageReactions';
import { socketClient } from '@/lib/socket';

interface Message {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  created_at: string;
  edited_at?: string;
  attachments?: any[];
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
    hasReacted: boolean;
  }>;
}

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const { messages, isLoading } = useMessageStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageReactions, setMessageReactions] = useState<{ [messageId: string]: any[] }>({});

  const channelMessages = messages[channelId] || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages]);

  // Listen for reaction events
  useEffect(() => {
    const handleReactionAdd = (data: any) => {
      if (channelMessages.find((m: Message) => m.id === data.messageId)) {
        setMessageReactions((prev) => ({
          ...prev,
          [data.messageId]: data.reactions,
        }));
      }
    };

    const handleReactionRemove = (data: any) => {
      if (channelMessages.find((m: Message) => m.id === data.messageId)) {
        setMessageReactions((prev) => ({
          ...prev,
          [data.messageId]: data.reactions,
        }));
      }
    };

    socketClient.getSocket()?.on('reaction:add', handleReactionAdd);
    socketClient.getSocket()?.on('reaction:remove', handleReactionRemove);

    return () => {
      socketClient.off('reaction:add', handleReactionAdd);
      socketClient.off('reaction:remove', handleReactionRemove);
    };
  }, [channelMessages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading messages...</div>
      </div>
    );
  }

  if (channelMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">💬</div>
          <div className="text-gray-400">No messages yet</div>
          <div className="text-sm text-gray-500 mt-1">Be the first to say something!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {channelMessages.map((message: Message) => {
        const reactions = messageReactions[message.id] || message.reactions || [];
        
        return (
          <div key={message.id} className="flex space-x-3 hover:bg-discord-gray/10 px-3 py-1 rounded group">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {message.user.avatar_url ? (
                <img
                  src={message.user.avatar_url}
                  alt={message.user.username}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-discord-blue rounded-full flex items-center justify-center text-white font-semibold">
                  {message.user.username[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Message content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-white">{message.user.username}</span>
                <span className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {message.edited_at && (
                  <span className="text-xs text-gray-500">(edited)</span>
                )}
              </div>
              <div className="text-gray-300 break-words">{message.content}</div>
              
              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.attachments.map((att: any, idx: number) => (
                    <div key={idx}>
                      {att.mimetype.startsWith('image/') ? (
                        <a href={`http://localhost:3001${att.url}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`http://localhost:3001${att.url}`}
                            alt={att.filename}
                            className="max-w-sm max-h-64 rounded border border-discord-gray hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : (
                        <a
                          href={`http://localhost:3001${att.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 px-3 py-2 bg-discord-gray rounded hover:bg-discord-gray/80 transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                          </svg>
                          <div>
                            <div className="text-sm text-white truncate max-w-[200px]">{att.filename}</div>
                            <div className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Reactions */}
              <MessageReactions
                messageId={message.id}
                reactions={reactions}
                onReactionUpdate={(newReactions) => {
                  setMessageReactions((prev) => ({
                    ...prev,
                    [message.id]: newReactions,
                  }));
                }}
              />
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
