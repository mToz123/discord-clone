// Message Controller
import { Response } from 'express';
import { z } from 'zod';
import { MessageModel } from '../models/Message';
import { ChannelModel } from '../models/Channel';
import { ServerModel } from '../models/Server';
import { AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';

// Validation schemas
const createMessageSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    url: z.string(),
    size: z.number(),
    mimetype: z.string(),
  })).optional(),
  embeds: z.array(z.any()).optional(),
  reply_to: z.string().uuid().optional(),
}).refine((data) => data.content || (data.attachments && data.attachments.length > 0), {
  message: 'Message must have content or attachments',
});

const updateMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export class MessageController {
  // Send message
  static async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { channelId } = req.params;
      const data = createMessageSchema.parse(req.body);

      // Get channel
      const channel = await ChannelModel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Check if user is member of server
      const isMember = await ServerModel.isMember(channel.server_id, req.user.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this server' });
      }

      // Create message
      const message = await MessageModel.create(
        channelId,
        req.user.userId,
        data.content || '',
        {
          attachments: data.attachments,
          embeds: data.embeds,
          reply_to: data.reply_to,
        }
      );

      // Get full message with user data
      const fullMessage = await MessageModel.findById(message.id);

      // Emit to Socket.io room
      io.to(`channel:${channelId}`).emit('message:create', fullMessage);

      return res.status(201).json({ message: fullMessage });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      console.error('Create message error:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // Get messages
  static async getMessages(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { channelId } = req.params;
      const { limit, before, after } = req.query;

      // Get channel
      const channel = await ChannelModel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Check if user is member of server
      const isMember = await ServerModel.isMember(channel.server_id, req.user.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this server' });
      }

      // Get messages
      const messages = await MessageModel.getChannelMessages(channelId, {
        limit: limit ? parseInt(limit as string) : undefined,
        before: before as string,
        after: after as string,
      });

      return res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  // Update message
  static async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId } = req.params;
      const data = updateMessageSchema.parse(req.body);

      // Get message
      const message = await MessageModel.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if user is author
      if (message.user_id !== req.user.userId) {
        return res.status(403).json({ error: 'You can only edit your own messages' });
      }

      // Update message
      const updatedMessage = await MessageModel.update(messageId, data.content);
      const fullMessage = await MessageModel.findById(updatedMessage.id);

      // Emit update event
      io.to(`channel:${message.channel_id}`).emit('message:update', fullMessage);

      return res.json({ message: fullMessage });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      console.error('Update message error:', error);
      return res.status(500).json({ error: 'Failed to update message' });
    }
  }

  // Delete message
  static async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId } = req.params;

      // Get message
      const message = await MessageModel.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if user is author or server owner
      const channel = await ChannelModel.findById(message.channel_id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const isOwner = await ServerModel.isOwner(channel.server_id, req.user.userId);
      const isAuthor = message.user_id === req.user.userId;

      if (!isAuthor && !isOwner) {
        return res.status(403).json({ error: 'You can only delete your own messages' });
      }

      // Delete message
      await MessageModel.delete(messageId);

      // Emit delete event
      io.to(`channel:${message.channel_id}`).emit('message:delete', {
        id: messageId,
        channel_id: message.channel_id,
      });

      return res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Delete message error:', error);
      return res.status(500).json({ error: 'Failed to delete message' });
    }
  }
}
