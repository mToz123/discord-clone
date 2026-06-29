// Main Express Server
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { setupSocketAuth } from './middleware/socket.middleware';
import { createServer } from 'http';
import authRoutes from './routes/auth.routes';
import serverRoutes from './routes/server.routes';
import channelRoutes from './routes/channel.routes';
import messageRoutes from './routes/message.routes';
import reactionRoutes from './routes/reaction.routes';
import uploadRoutes from './routes/upload.routes';
import botRoutes from './routes/bot.routes';
import botApiRoutes from './routes/bot-api.routes';
import dmRoutes from './routes/dm.routes';
import pool from './utils/db';
import { PresenceUtil } from './utils/presence';
import path from 'path';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Store io instance for access in controllers
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api', messageRoutes);
app.use('/api', reactionRoutes);
app.use('/api', uploadRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/bot', botApiRoutes);
app.use('/api/dm', dmRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

// Setup Socket.io authentication
setupSocketAuth(io);

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  const userId = socket.data.userId;
  const username = socket.data.username;

  // Update user status to online
  await PresenceUtil.updateStatus(userId, 'online');

  // Join user's personal room
  socket.join(`user:${userId}`);

  // Broadcast presence to all
  io.emit('presence:update', {
    userId,
    username,
    status: 'online',
  });

  // Join channel
  socket.on('channel:join', (channelId: string) => {
    socket.join(`channel:${channelId}`);
    console.log(`User ${username} joined channel: ${channelId}`);
  });

  // Leave channel
  socket.on('channel:leave', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
    console.log(`User ${username} left channel: ${channelId}`);
  });

  // Typing indicator
  socket.on('typing:start', (channelId: string) => {
    socket.to(`channel:${channelId}`).emit('typing:start', {
      userId,
      username,
      channelId,
    });
  });

  socket.on('typing:stop', (channelId: string) => {
    socket.to(`channel:${channelId}`).emit('typing:stop', {
      userId,
      channelId,
    });
  });

  // Presence update (online/idle/dnd)
  socket.on('presence:set', async (status: 'online' | 'idle' | 'dnd') => {
    await PresenceUtil.updateStatus(userId, status);
    io.emit('presence:update', { userId, username, status });
  });

  // Heartbeat to keep connection alive
  socket.on('heartbeat', async () => {
    await PresenceUtil.heartbeat(userId);
  });

  // DM events
  socket.on('dm:join', (conversationId: string) => {
    socket.join(`dm:${conversationId}`);
    console.log(`User ${username} joined DM: ${conversationId}`);
  });

  socket.on('dm:leave', (conversationId: string) => {
    socket.leave(`dm:${conversationId}`);
    console.log(`User ${username} left DM: ${conversationId}`);
  });

  socket.on('dm:typing:start', (conversationId: string) => {
    socket.to(`dm:${conversationId}`).emit('dm:typing:start', {
      userId,
      username,
      conversationId,
    });
  });

  socket.on('dm:typing:stop', (conversationId: string) => {
    socket.to(`dm:${conversationId}`).emit('dm:typing:stop', {
      userId,
      conversationId,
    });
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    
    // Update status to offline
    await PresenceUtil.updateStatus(userId, 'offline');
    
    // Broadcast offline status
    io.emit('presence:update', {
      userId,
      username,
      status: 'offline',
    });
  });
});

// Cleanup stale presence every 5 minutes
setInterval(async () => {
  await PresenceUtil.cleanupStalePresence();
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  httpServer.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Discord Clone Backend                ║
║   Server running on port ${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'development'}         ║
╚════════════════════════════════════════╝
  `);
});

export { io };
