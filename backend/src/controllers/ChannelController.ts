// Channel Controller
import { Response } from 'express';
import { z } from 'zod';
import { ChannelModel } from '../models/Channel';
import { ServerModel } from '../models/Server';
import { AuthRequest } from '../middleware/auth.middleware';

// Validation schemas
const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['text', 'voice', 'category', 'announcement']),
  parent_id: z.string().uuid().optional(),
  topic: z.string().max(500).optional(),
  is_private: z.boolean().optional(),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  topic: z.string().max(500).optional(),
  position: z.number().int().min(0).optional(),
  is_private: z.boolean().optional(),
  slowmode_seconds: z.number().int().min(0).max(21600).optional(),
});

export class ChannelController {
  // Create channel
  static async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { serverId } = req.params;
      const data = createChannelSchema.parse(req.body);

      // Check if user is member
      const isMember = await ServerModel.isMember(serverId, req.user.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this server' });
      }

      // For now, only owner can create channels (can add roles later)
      const isOwner = await ServerModel.isOwner(serverId, req.user.userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Only server owner can create channels' });
      }

      const channel = await ChannelModel.create(
        serverId,
        data.name,
        data.type,
        {
          parent_id: data.parent_id,
          topic: data.topic,
          is_private: data.is_private,
        }
      );

      return res.status(201).json({ channel });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      console.error('Create channel error:', error);
      return res.status(500).json({ error: 'Failed to create channel' });
    }
  }

  // Get channel by ID
  static async getChannel(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { channelId } = req.params;

      const channel = await ChannelModel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Check if user is member of server
      const isMember = await ServerModel.isMember(channel.server_id, req.user.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this server' });
      }

      return res.json({ channel });
    } catch (error) {
      console.error('Get channel error:', error);
      return res.status(500).json({ error: 'Failed to get channel' });
    }
  }

  // Update channel
  static async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { channelId } = req.params;
      const data = updateChannelSchema.parse(req.body);

      const channel = await ChannelModel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Check if user is owner
      const isOwner = await ServerModel.isOwner(channel.server_id, req.user.userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Only server owner can update channels' });
      }

      const updatedChannel = await ChannelModel.update(channelId, data);

      return res.json({ channel: updatedChannel });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      console.error('Update channel error:', error);
      return res.status(500).json({ error: 'Failed to update channel' });
    }
  }

  // Delete channel
  static async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { channelId } = req.params;

      const channel = await ChannelModel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Check if user is owner
      const isOwner = await ServerModel.isOwner(channel.server_id, req.user.userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Only server owner can delete channels' });
      }

      await ChannelModel.delete(channelId);

      return res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
      console.error('Delete channel error:', error);
      return res.status(500).json({ error: 'Failed to delete channel' });
    }
  }
}
