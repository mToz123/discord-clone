'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useServerStore } from '@/lib/server';
import { useMessageStore } from '@/lib/message';
import { useAuthStore } from '@/lib/auth';
import { socketClient } from '@/lib/socket';
import { ChannelList } from '@/components/server/ChannelList';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { MemberList } from '@/components/server/MemberList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

export default function ServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.serverId as string;
  
  const { token, user } = useAuthStore();
  const { currentServer, channels, fetchServer } = useServerStore();
  const { setCurrentChannel, addMessage, updateMessageInStore, removeMessage } = useMessageStore();
  
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);

  // Fetch server data
  useEffect(() => {
    if (serverId) {
      fetchServer(serverId);
    }
  }, [serverId, fetchServer]);

  // Connect socket
  useEffect(() => {
    if (token) {
      socketClient.connect(token);

      // Setup message listeners
      const handleNewMessage = (message: any) => {
        addMessage(message);
      };

      const handleUpdateMessage = (message: any) => {
        updateMessageInStore(message);
      };

      const handleDeleteMessage = (data: any) => {
        removeMessage(data.channel_id, data.id);
      };

      socketClient.onMessage(handleNewMessage);
      socketClient.onMessageUpdate(handleUpdateMessage);
      socketClient.onMessageDelete(handleDeleteMessage);

      return () => {
        socketClient.off('message:create', handleNewMessage);
        socketClient.off('message:update', handleUpdateMessage);
        socketClient.off('message:delete', handleDeleteMessage);
      };
    }
  }, [token, addMessage, updateMessageInStore, removeMessage]);

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !currentChannelId) {
      const firstChannel = channels[0];
      setCurrentChannelId(firstChannel.id);
      setCurrentChannel(firstChannel.id);
    }
  }, [channels, currentChannelId, setCurrentChannel]);

  const handleChannelSelect = (channelId: string) => {
    setCurrentChannelId(channelId);
    setCurrentChannel(channelId);
  };

  const currentChannel = channels.find((c) => c.id === currentChannelId);

  if (!currentServer) {
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-darkest">
        <div className="text-white">Loading server...</div>
      </div>
    );
  }

  return (
    <>
      {/* Channel sidebar */}
      <div className="w-60 bg-discord-darker flex flex-col">
        {/* Server header */}
        <div className="h-12 px-4 flex items-center border-b border-discord-darkest shadow-sm">
          <h2 className="text-white font-semibold truncate">{currentServer.name}</h2>
        </div>

        {/* Channel list */}
        <ChannelList
          serverId={serverId}
          currentChannelId={currentChannelId || undefined}
          onChannelSelect={handleChannelSelect}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {currentChannelId && currentChannel ? (
          <>
            {/* Channel header */}
            <div className="h-12 px-4 flex items-center border-b border-discord-darkest shadow-sm">
              <span className="text-gray-400 mr-2">#</span>
              <h3 className="text-white font-semibold">{currentChannel.name}</h3>
              {currentChannel.topic && (
                <>
                  <div className="w-px h-6 bg-discord-gray mx-3"></div>
                  <span className="text-sm text-gray-400 truncate">{currentChannel.topic}</span>
                </>
              )}
            </div>

            {/* Messages */}
            <MessageList channelId={currentChannelId} />

            {/* Typing indicator */}
            {user && <TypingIndicator channelId={currentChannelId} currentUserId={user.id} />}

            {/* Message input */}
            <MessageInput channelId={currentChannelId} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">👈</div>
              <div className="text-gray-400">Select a channel to start chatting</div>
            </div>
          </div>
        )}
      </div>

      {/* Member sidebar */}
      <div className="w-60 bg-discord-darker border-l border-discord-darkest">
        <div className="h-full flex flex-col">
          <div className="h-12 px-4 flex items-center border-b border-discord-darkest shadow-sm">
            <h3 className="text-sm font-semibold text-gray-400 uppercase">
              Members
            </h3>
          </div>
          <MemberList serverId={serverId} />
        </div>
      </div>
    </>
  );
}
