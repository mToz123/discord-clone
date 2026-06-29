import { Request, Response } from 'express';
import { DirectMessageModel, FriendshipModel } from '../models/DirectMessage';
import { z } from 'zod';

const sendDMSchema = z.object({
  content: z.string().min(1).max(2000),
  attachments: z.array(z.any()).optional()
});

const editDMSchema = z.object({
  content: z.string().min(1).max(2000)
});

export class DirectMessageController {
  // Get all DM conversations for current user
  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const conversations = await DirectMessageModel.getUserConversations(userId);

      res.json({ conversations });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }

  // Get or create conversation with another user
  static async getOrCreateConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const otherUserId = parseInt(req.params.userId);

      if (isNaN(otherUserId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (otherUserId === userId) {
        res.status(400).json({ error: 'Cannot DM yourself' });
        return;
      }

      // Check if blocked
      const isBlocked = await FriendshipModel.isBlocked(otherUserId, userId);
      if (isBlocked) {
        res.status(403).json({ error: 'You are blocked by this user' });
        return;
      }

      const conversation = await DirectMessageModel.getOrCreateConversation(userId, otherUserId);

      res.json({ conversation });
    } catch (error) {
      console.error('Get/create conversation error:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }

  // Get conversation by ID
  static async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        res.status(400).json({ error: 'Invalid conversation ID' });
        return;
      }

      const conversation = await DirectMessageModel.findById(conversationId, userId);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      res.json({ conversation });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  }

  // Get messages in conversation
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;

      if (isNaN(conversationId)) {
        res.status(400).json({ error: 'Invalid conversation ID' });
        return;
      }

      // Verify user is participant
      const conversation = await DirectMessageModel.findById(conversationId, userId);
      if (!conversation) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const messages = await DirectMessageModel.getMessages(conversationId, { limit, before });

      res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  // Send DM message
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        res.status(400).json({ error: 'Invalid conversation ID' });
        return;
      }

      const data = sendDMSchema.parse(req.body);

      // Verify user is participant
      const conversation = await DirectMessageModel.findById(conversationId, userId);
      if (!conversation) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const message = await DirectMessageModel.sendMessage(
        conversationId,
        userId,
        data.content,
        data.attachments
      );

      // Broadcast via Socket.io
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`dm:${conversationId}`).emit('dm:message', message);
      }

      res.status(201).json({ message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Send DM error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // Edit DM message
  static async editMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const messageId = parseInt(req.params.messageId);

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      const data = editDMSchema.parse(req.body);

      const message = await DirectMessageModel.editMessage(messageId, userId, data.content);

      if (!message) {
        res.status(404).json({ error: 'Message not found or access denied' });
        return;
      }

      // Broadcast update
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`dm:${message.conversation_id}`).emit('dm:message:update', message);
      }

      res.json({ message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Edit DM error:', error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  }

  // Delete DM message
  static async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const messageId = parseInt(req.params.messageId);

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      const success = await DirectMessageModel.deleteMessage(messageId, userId);

      if (!success) {
        res.status(404).json({ error: 'Message not found or access denied' });
        return;
      }

      // Broadcast delete
      const message = await DirectMessageModel.findMessageById(messageId);
      const io = (req.app as any).get('io');
      if (io && message) {
        io.to(`dm:${message.conversation_id}`).emit('dm:message:delete', { id: messageId });
      }

      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Delete DM error:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }

  // Mark conversation as read
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        res.status(400).json({ error: 'Invalid conversation ID' });
        return;
      }

      // Verify user is participant
      const conversation = await DirectMessageModel.findById(conversationId, userId);
      if (!conversation) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await DirectMessageModel.markAsRead(conversationId, userId);

      res.json({ message: 'Conversation marked as read' });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  }

  // Get unread count
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const count = await DirectMessageModel.getUnreadCount(userId);

      res.json({ count });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  }
}

export class FriendshipController {
  // Send friend request
  static async sendRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const addresseeId = parseInt(req.params.userId);

      if (isNaN(addresseeId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (addresseeId === userId) {
        res.status(400).json({ error: 'Cannot friend yourself' });
        return;
      }

      // Check if already blocked
      const isBlocked = await FriendshipModel.isBlocked(addresseeId, userId);
      if (isBlocked) {
        res.status(403).json({ error: 'Cannot send friend request to this user' });
        return;
      }

      const request = await FriendshipModel.sendRequest(userId, addresseeId);

      if (!request) {
        res.status(400).json({ error: 'Friend request already exists' });
        return;
      }

      // Notify via Socket.io
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`user:${addresseeId}`).emit('friend:request', request);
      }

      res.status(201).json({ request, message: 'Friend request sent' });
    } catch (error) {
      console.error('Send friend request error:', error);
      res.status(500).json({ error: 'Failed to send friend request' });
    }
  }

  // Accept friend request
  static async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const requesterId = parseInt(req.params.userId);

      if (isNaN(requesterId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const success = await FriendshipModel.acceptRequest(requesterId, userId);

      if (!success) {
        res.status(404).json({ error: 'Friend request not found' });
        return;
      }

      // Notify via Socket.io
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`user:${requesterId}`).emit('friend:accepted', { userId });
      }

      res.json({ message: 'Friend request accepted' });
    } catch (error) {
      console.error('Accept friend request error:', error);
      res.status(500).json({ error: 'Failed to accept friend request' });
    }
  }

  // Remove friend
  static async removeFriend(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const friendId = parseInt(req.params.userId);

      if (isNaN(friendId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const success = await FriendshipModel.removeFriend(userId, friendId);

      if (!success) {
        res.status(404).json({ error: 'Friendship not found' });
        return;
      }

      // Notify via Socket.io
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`user:${friendId}`).emit('friend:removed', { userId });
      }

      res.json({ message: 'Friend removed successfully' });
    } catch (error) {
      console.error('Remove friend error:', error);
      res.status(500).json({ error: 'Failed to remove friend' });
    }
  }

  // Block user
  static async blockUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const blockedId = parseInt(req.params.userId);

      if (isNaN(blockedId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (blockedId === userId) {
        res.status(400).json({ error: 'Cannot block yourself' });
        return;
      }

      await FriendshipModel.blockUser(userId, blockedId);

      res.json({ message: 'User blocked successfully' });
    } catch (error) {
      console.error('Block user error:', error);
      res.status(500).json({ error: 'Failed to block user' });
    }
  }

  // Get friends list
  static async getFriends(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const friends = await FriendshipModel.getFriends(userId);

      res.json({ friends });
    } catch (error) {
      console.error('Get friends error:', error);
      res.status(500).json({ error: 'Failed to fetch friends' });
    }
  }

  // Get pending friend requests
  static async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const requests = await FriendshipModel.getPendingRequests(userId);

      res.json({ requests });
    } catch (error) {
      console.error('Get pending requests error:', error);
      res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
  }

  // Get friendship status
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const otherUserId = parseInt(req.params.userId);

      if (isNaN(otherUserId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const status = await FriendshipModel.getStatus(userId, otherUserId);

      res.json({ status: status || 'none' });
    } catch (error) {
      console.error('Get friendship status error:', error);
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  }
}
