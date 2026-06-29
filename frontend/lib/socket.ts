// Socket.io Client
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class SocketClient {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(API_URL, {
      auth: {
        token,
      },
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Channel actions
  joinChannel(channelId: string) {
    this.socket?.emit('channel:join', channelId);
  }

  leaveChannel(channelId: string) {
    this.socket?.emit('channel:leave', channelId);
  }

  // Typing indicators
  startTyping(channelId: string) {
    this.socket?.emit('typing:start', channelId);
  }

  stopTyping(channelId: string) {
    this.socket?.emit('typing:stop', channelId);
  }

  // Event listeners
  onMessage(callback: (message: any) => void) {
    this.socket?.on('message:create', callback);
  }

  onMessageUpdate(callback: (message: any) => void) {
    this.socket?.on('message:update', callback);
  }

  onMessageDelete(callback: (data: any) => void) {
    this.socket?.on('message:delete', callback);
  }

  onTypingStart(callback: (data: any) => void) {
    this.socket?.on('typing:start', callback);
  }

  onTypingStop(callback: (data: any) => void) {
    this.socket?.on('typing:stop', callback);
  }

  // Remove listeners
  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }
}

export const socketClient = new SocketClient();
