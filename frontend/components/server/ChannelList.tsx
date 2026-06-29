'use client';

import { useServerStore } from '@/lib/server';

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface ChannelListProps {
  serverId: string;
  currentChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export function ChannelList({ serverId, currentChannelId, onChannelSelect }: ChannelListProps) {
  const { channels } = useServerStore();

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Text Channels */}
      {textChannels.length > 0 && (
        <div className="mb-4">
          <div className="px-2 py-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41045 9L8.35045 15H14.3504L15.4104 9H9.41045Z" />
              </svg>
              Text Channels
            </h3>
          </div>
          {textChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={`w-full px-2 py-1.5 text-left rounded flex items-center space-x-2 group ${
                currentChannelId === channel.id
                  ? 'bg-discord-gray/50 text-white'
                  : 'text-gray-400 hover:bg-discord-gray/30 hover:text-gray-300'
              }`}
            >
              <span className="text-gray-500 group-hover:text-gray-400">#</span>
              <span className="text-sm font-medium truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Voice Channels */}
      {voiceChannels.length > 0 && (
        <div>
          <div className="px-2 py-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.486 2 2 6.486 2 12C2 17.514 6.486 22 12 22C17.514 22 22 17.514 22 12C22 6.486 17.514 2 12 2ZM16.597 16.597C15.178 18.016 13.281 18.858 11.263 18.858C9.245 18.858 7.348 18.016 5.929 16.597C4.51 15.178 3.668 13.281 3.668 11.263C3.668 9.245 4.51 7.348 5.929 5.929C7.348 4.51 9.245 3.668 11.263 3.668C13.281 3.668 15.178 4.51 16.597 5.929C18.016 7.348 18.858 9.245 18.858 11.263C18.858 13.281 18.016 15.178 16.597 16.597Z" />
              </svg>
              Voice Channels
            </h3>
          </div>
          {voiceChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className="w-full px-2 py-1.5 text-left rounded flex items-center space-x-2 text-gray-400 hover:bg-discord-gray/30 hover:text-gray-300 group"
            >
              <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 8.00004H3C2.45 8.00004 2 8.45004 2 9.00004V15C2 15.55 2.45 16 3 16H6L10.293 20.71C10.579 20.996 11.009 21.082 11.383 20.927C11.757 20.772 12 20.407 12 20V4.00004C12 3.59304 11.757 3.22804 11.383 3.07904ZM14 5.00004V7.00004C16.757 7.00004 19 9.24304 19 12C19 14.757 16.757 17 14 17V19C17.86 19 21 15.86 21 12C21 8.14004 17.86 5.00004 14 5.00004ZM14 9.00004V11C15.654 11 17 12.346 17 14C17 15.654 15.654 17 14 17V15C14.551 15 15 14.551 15 14C15 13.449 14.551 13 14 13V11C15.103 11 16 11.897 16 13C16 14.103 15.103 15 14 15Z" />
              </svg>
              <span className="text-sm font-medium truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
