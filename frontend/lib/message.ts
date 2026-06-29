// Message Store (Zustand)
import { create } from 'zustand';
import { api } from './api';
import { socketClient } from './socket';

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  created_at: string;
  edited_at?: string;
}

interface MessageState {
  messages: { [channelId: string]: Message[] };
  currentChannelId: string | null;
  typingUsers: { [channelId: string]: Set<string> };
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentChannel: (channelId: string) => void;
  fetchMessages: (channelId: string, options?: { limit?: number; before?: string }) => Promise<void>;
  sendMessage: (channelId: string, content: string, attachments?: any[]) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  updateMessageInStore: (message: Message) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  addTypingUser: (channelId: string, userId: string) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  currentChannelId: null,
  typingUsers: {},
  isLoading: false,
  error: null,

  setCurrentChannel: (channelId: string) => {
    const prevChannelId = get().currentChannelId;
    
    // Leave previous channel
    if (prevChannelId) {
      socketClient.leaveChannel(prevChannelId);
    }

    // Join new channel
    socketClient.joinChannel(channelId);
    
    set({ currentChannelId: channelId });

    // Fetch messages if not loaded
    if (!get().messages[channelId]) {
      get().fetchMessages(channelId);
    }
  },

  fetchMessages: async (channelId: string, options?: { limit?: number; before?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.before) params.append('before', options.before);

      const response = await api.get(`/api/channels/${channelId}/messages?${params}`);
      
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: response.data.messages,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch messages',
        isLoading: false,
      });
    }
  },

  sendMessage: async (channelId: string, content: string, attachments?: any[]) => {
    try {
      await api.post(`/api/channels/${channelId}/messages`, { 
        content,
        attachments: attachments || []
      });
      // Message will be added via socket event
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to send message' });
      throw error;
    }
  },

  updateMessage: async (messageId: string, content: string) => {
    try {
      await api.patch(`/api/messages/${messageId}`, { content });
      // Message will be updated via socket event
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update message' });
      throw error;
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await api.delete(`/api/messages/${messageId}`);
      // Message will be removed via socket event
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete message' });
      throw error;
    }
  },

  addMessage: (message: Message) => {
    set((state) => {
      const channelMessages = state.messages[message.channel_id] || [];
      return {
        messages: {
          ...state.messages,
          [message.channel_id]: [...channelMessages, message],
        },
      };
    });
  },

  removeMessage: (channelId: string, messageId: string) => {
    set((state) => {
      const channelMessages = state.messages[channelId] || [];
      return {
        messages: {
          ...state.messages,
          [channelId]: channelMessages.filter((m) => m.id !== messageId),
        },
      };
    });
  },

  updateMessageInStore: (message: Message) => {
    set((state) => {
      const channelMessages = state.messages[message.channel_id] || [];
      return {
        messages: {
          ...state.messages,
          [message.channel_id]: channelMessages.map((m) =>
            m.id === message.id ? message : m
          ),
        },
      };
    });
  },

  startTyping: (channelId: string) => {
    socketClient.startTyping(channelId);
  },

  stopTyping: (channelId: string) => {
    socketClient.stopTyping(channelId);
  },

  addTypingUser: (channelId: string, userId: string) => {
    set((state) => {
      const users = state.typingUsers[channelId] || new Set();
      users.add(userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: users,
        },
      };
    });
  },

  removeTypingUser: (channelId: string, userId: string) => {
    set((state) => {
      const users = state.typingUsers[channelId] || new Set();
      users.delete(userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: users,
        },
      };
    });
  },

  clearError: () => set({ error: null }),
}));
