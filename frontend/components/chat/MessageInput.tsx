'use client';

import { useState, useRef, useEffect } from 'react';
import { useMessageStore } from '@/lib/message';
import { FileUpload } from './FileUpload';

interface MessageInputProps {
  channelId: string;
}

export function MessageInput({ channelId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const { sendMessage, startTyping, stopTyping } = useMessageStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(channelId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(channelId);
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && attachments.length === 0) return;

    try {
      await sendMessage(channelId, message.trim() || ' ', attachments);
      setMessage('');
      setAttachments([]);
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        stopTyping(channelId);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUploaded = (attachment: any) => {
    setAttachments([...attachments, attachment]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping(channelId);
      }
    };
  }, [channelId, isTyping, stopTyping]);

  return (
    <div className="p-4 bg-discord-darkest">
      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att, index) => (
            <div key={index} className="relative group">
              {att.mimetype.startsWith('image/') ? (
                <img
                  src={`http://localhost:3001${att.url}`}
                  alt={att.filename}
                  className="h-20 rounded border border-discord-gray"
                />
              ) : (
                <div className="px-3 py-2 bg-discord-gray rounded border border-discord-gray">
                  <div className="text-sm text-white truncate max-w-[200px]">{att.filename}</div>
                  <div className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} KB</div>
                </div>
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-discord-gray rounded-lg">
          {/* File upload button */}
          <FileUpload onFileUploaded={handleFileUploaded} />

          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-transparent text-white placeholder-gray-500 focus:outline-none"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!message.trim() && attachments.length === 0}
            className="px-4 py-3 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
