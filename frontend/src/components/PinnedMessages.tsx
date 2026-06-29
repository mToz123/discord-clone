'use client';

import { useState, useEffect } from 'react';
import { Pin, X } from 'lucide-react';
import { api } from '@/lib/api';

interface PinnedMessage {
  id: number;
  message_id: number;
  content: string;
  message_created_at: string;
  user: {
    id: number;
    username: string;
    avatar_url?: string;
  };
}

interface PinnedMessagesProps {
  channelId: string;
  onClose: () => void;
  onSelectMessage?: (messageId: number) => void;
}

export default function PinnedMessages({ channelId, onClose, onSelectMessage }: PinnedMessagesProps) {
  const [pins, setPins] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPins();
  }, [channelId]);

  const fetchPins = async () => {
    try {
      const response = await api.get(`/channels/${channelId}/pins`);
      setPins(response.data.pins || []);
    } catch (error) {
      console.error('Failed to fetch pins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (messageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/messages/${messageId}/pin`);
      setPins(pins.filter(p => p.message_id !== messageId));
    } catch (error) {
      console.error('Failed to unpin:', error);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-800 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Pin size={20} className="text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Pinned Messages</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center text-gray-400 py-8">
            Loading pins...
          </div>
        )}

        {!loading && pins.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Pin size={48} className="mx-auto mb-3 opacity-50" />
            <p>No pinned messages yet</p>
            <p className="text-sm mt-1">Pin important messages to find them later</p>
          </div>
        )}

        {!loading && pins.map((pin) => (
          <div
            key={pin.id}
            onClick={() => onSelectMessage?.(pin.message_id)}
            className="mb-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer relative group"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {pin.user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-semibold text-white">{pin.user.username}</span>
                    <span className="text-gray-400 text-xs">
                      {new Date(pin.message_created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleUnpin(pin.message_id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-800"
                    title="Unpin"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-gray-300 text-sm mt-1 break-words line-clamp-3">
                  {pin.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {pins.length > 0 && (
        <div className="p-3 border-t border-gray-700 text-sm text-gray-400 text-center">
          {pins.length} pinned message{pins.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
