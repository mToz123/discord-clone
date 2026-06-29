// Reaction Controller
import { Response } from 'express';
import { z } from 'zod';
import { ReactionModel } from '../models/Reaction';
import { MessageModel } from '../models/Message';
import { ChannelModel } from '../models/Channel';
import { ServerModel } from '../models/Server';
import { AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';

// Validation schema
const addReactionSchema = z.object({
  emoji: z.string().min(1).max(100),
});

export class ReactionController {
  // Add reaction
  static async add(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId } = req.params;
      const data = addReactionSchema.parse(req.body);

      // Check if message exists
      const message = await MessageModel.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if user is member of server
      const channel = await ChannelModel.findById(message.channel_id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const isMember = await ServerModel.isMember(channel.server_id, req.user.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this server' });
      }

      // Add reaction
      await ReactionModel.add(messageId, req.user.userId, data.emoji);

      // Get updated reactions
      const reactions = await ReactionModel.getMessageReactions(messageId, req.user.userId);

      // Emit to channel
      io.to(`channel:${message.channel_id}`).emit('reaction:add', {
        messageId,
        userId: req.user.userId,
        emoji: data.emoji,
        reactions,
      });

      return res.json({ reactions });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      console.error('Add reaction error:', error);
      return res.status(500).json({ error: 'Failed to add reaction' });
    }
  }

  // Remove reaction
  static async remove(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId, emoji } = req.params;

      // Check if message exists
      const message = await MessageModel.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Remove reaction
      await ReactionModel.remove(messageId, req.user.userId, emoji);

      // Get updated reactions
      const reactions = await ReactionModel.getMessageReactions(messageId, req.user.userId);

      // Emit to channel
      const channel = await ChannelModel.findById(message.channel_id);
      if (channel) {
        io.to(`channel:${message.channel_id}`).emit('reaction:remove', {
          messageId,
          userId: req.user.userId,
          emoji,
          reactions,
        });
      }

      return res.json({ reactions });
    } catch (error) {
      console.error('Remove reaction error:', error);
      return res.status(500).json({ error: 'Failed to remove reaction' });
    }
  }

  // Get reactions for a message
  static async getMessageReactions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId } = req.params;

      const reactions = await ReactionModel.getMessageReactions(messageId, req.user.userId);

      return res.json({ reactions });
    } catch (error) {
      console.error('Get reactions error:', error);
      return res.status(500).json({ error: 'Failed to get reactions' });
    }
  }
}
