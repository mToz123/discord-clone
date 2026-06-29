// Socket.io Authentication Middleware
import { Server, Socket } from 'socket.io';
import { JWTUtil } from '../utils/jwt';

export function setupSocketAuth(io: Server) {
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const payload = JWTUtil.verify(token);
      
      if (!payload) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // Attach user data to socket
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;

      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });
}
