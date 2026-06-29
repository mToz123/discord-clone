import { Request, Response } from 'express';
import { EmbedModel, PinModel, MentionModel, SearchModel } from '../models/RichContent';
import { MessageModel } from '../models/Message';
import { LinkPreviewUtil } from '../utils/richContent';
import { z } from 'zod';

const embedSchema = z.object({
  type: z.enum(['rich', 'link', 'image', 'video']).optional(),
  title: z.string().max(256).optional(),
  description: z.string().max(2048).optional(),
  url: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  thumbnail_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  footer_text: z.string().max(256).optional(),
  footer_icon_url: z.string().url().optional(),
  author_name: z.string().max(256).optional(),
  author_url: z.string().url().optional(),
  author_icon_url: z.string().url().optional(),
  fields: z.array(z.object({
    name: z.string().max(256),
    value: z.string().max(1024),
    inline: z.boolean().optional()
  })).max(25).optional()
});

export class RichContentController {
  // Create/update embeds for message
  static async createEmbed(req: Request, res: Response): Promise<void> {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user!.id;

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      // Verify message ownership
      const message = await MessageModel.findById(messageId.toString());
      if (!message || message.user_id !== userId.toString()) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const data = embedSchema.parse(req.body);
      const embed = await EmbedModel.create(messageId, data);

      res.status(201).json({ embed });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Create embed error:', error);
      res.status(500).json({ error: 'Failed to create embed' });
    }
  }

  // Generate link preview
  static async generateLinkPreview(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      if (!LinkPreviewUtil.shouldPreview(url)) {
        res.status(400).json({ error: 'URL not supported for preview' });
        return;
      }

      const preview = await LinkPreviewUtil.fetchPreview(url);

      if (!preview) {
        res.status(404).json({ error: 'Failed to fetch preview' });
        return;
      }

      res.json({ preview });
    } catch (error) {
      console.error('Link preview error:', error);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  }

  // Pin message
  static async pinMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user!.id;

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      // Get message and verify channel access
      const message = await MessageModel.findById(messageId.toString());
      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const channelId = parseInt(message.channel_id);

      // Check pin limit (50 pins per channel)
      const pinCount = await PinModel.getCount(channelId);
      if (pinCount >= 50) {
        res.status(400).json({ error: 'Pin limit reached (50 per channel)' });
        return;
      }

      // TODO: Check user has permission to pin messages

      const pin = await PinModel.pin(messageId, channelId, userId);

      if (!pin) {
        res.status(400).json({ error: 'Message already pinned' });
        return;
      }

      // Broadcast pin event
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`channel:${channelId}`).emit('message:pin', { messageId, userId });
      }

      res.status(201).json({ pin });
    } catch (error) {
      console.error('Pin message error:', error);
      res.status(500).json({ error: 'Failed to pin message' });
    }
  }

  // Unpin message
  static async unpinMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user!.id;

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      // Get message
      const message = await MessageModel.findById(messageId.toString());
      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      // TODO: Check user has permission to unpin messages

      const success = await PinModel.unpin(messageId);

      if (!success) {
        res.status(404).json({ error: 'Message not pinned' });
        return;
      }

      // Broadcast unpin event
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`channel:${message.channel_id}`).emit('message:unpin', { messageId, userId });
      }

      res.json({ message: 'Message unpinned successfully' });
    } catch (error) {
      console.error('Unpin message error:', error);
      res.status(500).json({ error: 'Failed to unpin message' });
    }
  }

  // Get pinned messages for channel
  static async getPinnedMessages(req: Request, res: Response): Promise<void> {
    try {
      const channelId = parseInt(req.params.channelId);

      if (isNaN(channelId)) {
        res.status(400).json({ error: 'Invalid channel ID' });
        return;
      }

      const pins = await PinModel.getByChannelId(channelId);

      res.json({ pins });
    } catch (error) {
      console.error('Get pinned messages error:', error);
      res.status(500).json({ error: 'Failed to fetch pinned messages' });
    }
  }

  // Search messages in channel
  static async searchChannel(req: Request, res: Response): Promise<void> {
    try {
      const channelId = req.params.channelId;
      const query = req.query.q as string;
      const userId = req.query.user as string | undefined;
      const before = req.query.before ? new Date(req.query.before as string) : undefined;
      const after = req.query.after ? new Date(req.query.after as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!query || query.trim().length === 0) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const results = await SearchModel.searchInChannel(channelId, query, {
        userId,
        before,
        after,
        limit
      });

      res.json({ results, count: results.length });
    } catch (error) {
      console.error('Search channel error:', error);
      res.status(500).json({ error: 'Failed to search messages' });
    }
  }

  // Search messages in server
  static async searchServer(req: Request, res: Response): Promise<void> {
    try {
      const serverId = req.params.serverId;
      const query = req.query.q as string;
      const userId = req.query.user as string | undefined;
      const channelId = req.query.channel as string | undefined;
      const before = req.query.before ? new Date(req.query.before as string) : undefined;
      const after = req.query.after ? new Date(req.query.after as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!query || query.trim().length === 0) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const results = await SearchModel.searchInServer(serverId, query, {
        userId,
        channelId,
        before,
        after,
        limit
      });

      res.json({ results, count: results.length });
    } catch (error) {
      console.error('Search server error:', error);
      res.status(500).json({ error: 'Failed to search messages' });
    }
  }

  // Get mentions for user
  static async getMentions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const mentions = await MentionModel.getUnreadMentions(userId, limit);

      res.json({ mentions });
    } catch (error) {
      console.error('Get mentions error:', error);
      res.status(500).json({ error: 'Failed to fetch mentions' });
    }
  }
}
