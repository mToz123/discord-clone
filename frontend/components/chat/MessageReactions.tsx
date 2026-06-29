'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface ReactionSummary {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: ReactionSummary[];
  onReactionUpdate: (reactions: ReactionSummary[]) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🚀', '👀'];

export function MessageReactions({ messageId, reactions, onReactionUpdate }: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReactionClick = async (emoji: string, hasReacted: boolean) => {
    try {
      if (hasReacted) {
        // Remove reaction
        const response = await api.delete(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
        onReactionUpdate(response.data.reactions);
      } else {
        // Add reaction
        const response = await api.post(`/api/messages/${messageId}/reactions`, { emoji });
        onReactionUpdate(response.data.reactions);
      }
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    setShowPicker(false);
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing && existing.hasReacted) {
      return; // Already reacted
    }
    await handleReactionClick(emoji, false);
  };

  return (
    <div className="flex items-center space-x-1 mt-1">
      {/* Existing reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji, reaction.hasReacted)}
          className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
            reaction.hasReacted
              ? 'bg-discord-blue/20 border border-discord-blue text-white'
              : 'bg-discord-gray/50 border border-transparent text-gray-300 hover:bg-discord-gray hover:border-gray-600'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span className="text-xs">{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center justify-center w-8 h-8 rounded bg-discord-gray/50 hover:bg-discord-gray text-gray-400 hover:text-gray-200 transition-colors"
          title="Add reaction"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.486 2 2 6.486 2 12C2 17.514 6.486 22 12 22C17.514 22 22 17.514 22 12C22 6.486 17.514 2 12 2ZM12 20C7.589 20 4 16.411 4 12C4 7.589 7.589 4 12 4C16.411 4 20 7.589 20 12C20 16.411 16.411 20 12 20ZM8.5 11C9.328 11 10 10.328 10 9.5C10 8.672 9.328 8 8.5 8C7.672 8 7 8.672 7 9.5C7 10.328 7.672 11 8.5 11ZM15.5 11C16.328 11 17 10.328 17 9.5C17 8.672 16.328 8 15.5 8C14.672 8 14 8.672 14 9.5C14 10.328 14.672 11 15.5 11ZM12 17.5C14.33 17.5 16.32 16.04 17.12 14H6.88C7.68 16.04 9.67 17.5 12 17.5Z" />
          </svg>
        </button>

        {/* Emoji picker */}
        {showPicker && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowPicker(false)}
            />
            
            {/* Picker */}
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-discord-darker border border-discord-gray rounded-lg shadow-xl z-20">
              <div className="grid grid-cols-4 gap-1">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-discord-gray rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
