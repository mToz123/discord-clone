// Server Store (Zustand)
import { create } from 'zustand';
import { api } from './api';

interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: string;
  topic?: string;
  position: number;
}

interface Server {
  id: string;
  name: string;
  icon_url?: string;
  description?: string;
  owner_id: string;
}

interface ServerState {
  servers: Server[];
  currentServer: Server | null;
  channels: Channel[];
  members: any[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchServers: () => Promise<void>;
  fetchServer: (serverId: string) => Promise<void>;
  createServer: (name: string, icon_url?: string, description?: string) => Promise<Server>;
  updateServer: (serverId: string, updates: any) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;
  joinServer: (serverId: string) => Promise<void>;
  leaveServer: (serverId: string) => Promise<void>;
  createChannel: (serverId: string, name: string, type: string) => Promise<void>;
  clearError: () => void;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  currentServer: null,
  channels: [],
  members: [],
  isLoading: false,
  error: null,

  fetchServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/servers');
      set({ servers: response.data.servers, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch servers',
        isLoading: false,
      });
    }
  },

  fetchServer: async (serverId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/servers/${serverId}`);
      set({
        currentServer: response.data.server,
        channels: response.data.channels,
        members: response.data.members,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch server',
        isLoading: false,
      });
    }
  },

  createServer: async (name: string, icon_url?: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/servers', {
        name,
        icon_url,
        description,
      });
      const newServer = response.data.server;
      set((state) => ({
        servers: [...state.servers, newServer],
        isLoading: false,
      }));
      return newServer;
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create server',
        isLoading: false,
      });
      throw error;
    }
  },

  updateServer: async (serverId: string, updates: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/api/servers/${serverId}`, updates);
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === serverId ? response.data.server : s
        ),
        currentServer:
          state.currentServer?.id === serverId
            ? response.data.server
            : state.currentServer,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to update server',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteServer: async (serverId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/servers/${serverId}`);
      set((state) => ({
        servers: state.servers.filter((s) => s.id !== serverId),
        currentServer:
          state.currentServer?.id === serverId ? null : state.currentServer,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to delete server',
        isLoading: false,
      });
      throw error;
    }
  },

  joinServer: async (serverId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/api/servers/${serverId}/join`);
      set((state) => ({
        servers: [...state.servers, response.data.server],
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to join server',
        isLoading: false,
      });
      throw error;
    }
  },

  leaveServer: async (serverId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/api/servers/${serverId}/leave`);
      set((state) => ({
        servers: state.servers.filter((s) => s.id !== serverId),
        currentServer:
          state.currentServer?.id === serverId ? null : state.currentServer,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to leave server',
        isLoading: false,
      });
      throw error;
    }
  },

  createChannel: async (serverId: string, name: string, type: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/api/channels/servers/${serverId}/channels`, {
        name,
        type,
      });
      set((state) => ({
        channels: [...state.channels, response.data.channel],
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create channel',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
