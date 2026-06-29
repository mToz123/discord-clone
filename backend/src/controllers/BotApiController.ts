import { Request, Response } from 'express';
import { MessageModel } from '../models/Message';
import { ServerModel } from '../models/Server';
import { ChannelModel } from '../models/Channel';
import { ReactionModel } from '../models/Reaction';
import { BotModel } from '../models/Bot';
import { z } from 'zod';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    mimetype: z.string()
  })).optional()
}).refine(data => data.content || (data.attachments && data.attachments.length > 0), {
  message: 'Either content or attachments must be provided'
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(2000)
});

export class BotApiController {
  // Get bot info
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      const bot = await BotModel.findById(req.bot!.id);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      res.json({
        id: bot.id,
        name: bot.name,
        avatar: bot.avatar,
        prefix: bot.prefix,
        description: bot.description,
        permissions: bot.permissions
      });
    } catch (error) {
      console.error('Get bot info error:', error);
      res.status(500).json({ error: 'Failed to fetch bot info' });
    }
  }

  // Send message as bot
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const channelId = parseInt(req.params.channelId);
      const botId = req.bot!.id;

      if (isNaN(channelId)) {
        res.status(400).json({ error: 'Invalid channel ID' });
        return;
      }

      const data = sendMessageSchema.parse(req.body);

      // Get bot info to use as "user"
      const bot = await BotModel.findById(botId);
      
      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      // Create message from bot
      const attachments = data.attachments?.map(att => ({
        id: Math.random().toString(36).substring(7),
        filename: att.filename,
        url: att.url,
        size: 0,
        mimetype: att.mimetype
      }));
      
      const message = await MessageModel.create(
        channelId.toString(),
        bot.user_id.toString(),
        data.content || '',
        attachments ? { attachments } : undefined
      );

      // Broadcast via Socket.io
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`channel:${channelId}`).emit('message:create', {
          ...message,
          user: {
            id: bot.user_id,
            username: bot.name,
            avatar: bot.avatar,
            is_bot: true
          }
        });
      }

      res.status(201).json({ message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Bot send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // Edit message
  static async editMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageId = parseInt(req.params.messageId);
      const botId = req.bot!.id;

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      const data = editMessageSchema.parse(req.body);

      const message = await MessageModel.findById(messageId.toString());

      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      // Get bot info
      const bot = await BotModel.findById(botId);

      if (!bot || message.user_id !== bot.user_id.toString()) {
        res.status(403).json({ error: 'Can only edit own messages' });
        return;
      }

      const updated = await MessageModel.update(messageId.toString(), data.content);

      // Broadcast update
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`channel:${message.channel_id}`).emit('message:update', updated);
      }

      res.json({ message: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Bot edit message error:', error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  }

  // Delete message
  static async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageId = parseInt(req.params.messageId);
      const botId = req.bot!.id;

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      const message = await MessageModel.findById(messageId.toString());

      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      // Get bot info
      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      // Bot can delete own messages or any message if has manage_messages permission
      if (message.user_id !== bot.user_id.toString() && !req.bot!.permissions.includes('manage_messages')) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      await MessageModel.delete(messageId.toString());

      // Broadcast delete
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`channel:${message.channel_id}`).emit('message:delete', { id: messageId });
      }

      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Bot delete message error:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }

  // Add reaction
  static async addReaction(req: Request, res: Response): Promise<void> {
    try {
      const messageId = parseInt(req.params.messageId);
      const emoji = req.params.emoji;
      const botId = req.bot!.id;

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      const reaction = await ReactionModel.add(messageId.toString(), bot.user_id.toString(), emoji);
      const message = await MessageModel.findById(messageId.toString());

      // Broadcast reaction
      const io = (req.app as any).get('io');
      if (io && message) {
        io.to(`channel:${message.channel_id}`).emit('reaction:add', {
          message_id: messageId,
          user_id: bot.user_id,
          emoji
        });
      }

      res.status(201).json({ reaction });
    } catch (error) {
      console.error('Bot add reaction error:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  }

  // Remove reaction
  static async removeReaction(req: Request, res: Response): Promise<void> {
    try {
      const messageId = parseInt(req.params.messageId);
      const emoji = req.params.emoji;
      const botId = req.bot!.id;

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      await ReactionModel.remove(messageId.toString(), bot.user_id.toString(), emoji);
      const message = await MessageModel.findById(messageId.toString());

      // Broadcast reaction removal
      const io = (req.app as any).get('io');
      if (io && message) {
        io.to(`channel:${message.channel_id}`).emit('reaction:remove', {
          message_id: messageId,
          user_id: bot.user_id,
          emoji
        });
      }

      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error('Bot remove reaction error:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  }

  // Get channel messages
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const channelId = parseInt(req.params.channelId);
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? req.query.before as string : undefined;

      if (isNaN(channelId)) {
        res.status(400).json({ error: 'Invalid channel ID' });
        return;
      }

      const messages = await MessageModel.getChannelMessages(channelId.toString(), { limit, before });

      res.json({ messages });
    } catch (error) {
      console.error('Bot get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  // Get server info
  static async getServer(req: Request, res: Response): Promise<void> {
    try {
      const serverId = parseInt(req.params.serverId);

      if (isNaN(serverId)) {
        res.status(400).json({ error: 'Invalid server ID' });
        return;
      }

      const server = await ServerModel.findById(serverId.toString());

      if (!server) {
        res.status(404).json({ error: 'Server not found' });
        return;
      }

      res.json({ server });
    } catch (error) {
      console.error('Bot get server error:', error);
      res.status(500).json({ error: 'Failed to fetch server' });
    }
  }

  // Get server channels
  static async getChannels(req: Request, res: Response): Promise<void> {
    try {
      const serverId = parseInt(req.params.serverId);

      if (isNaN(serverId)) {
        res.status(400).json({ error: 'Invalid server ID' });
        return;
      }

      const channels = await ChannelModel.getServerChannels(serverId.toString());

      res.json({ channels });
    } catch (error) {
      console.error('Bot get channels error:', error);
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  }

  // Get server members
  static async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const serverId = parseInt(req.params.serverId);

      if (isNaN(serverId)) {
        res.status(400).json({ error: 'Invalid server ID' });
        return;
      }

      const members = await ServerModel.getMembers(serverId.toString());

      res.json({ members });
    } catch (error) {
      console.error('Bot get members error:', error);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  }
}
