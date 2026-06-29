// Server Controller
import { Response } from 'express';
import { z } from 'zod';
import { ServerModel } from '../models/Server';
import { ChannelModel } from '../models/Channel';
import { RoleModel } from '../models/Role';
import { AuthRequest } from '../middleware/auth.middleware';

// Validation schemas
const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  icon_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon_url: z.string().url().optional(),
  banner_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

export class ServerController {
  // Create server
  static async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const data = createServerSchema.parse(req.body);
      const server = await ServerModel.create(
        data.name,
        req.user.userId,
        {
          icon_url: data.icon_url,
          description: data.description,
        }
      );

      // Auto-create @everyone role
      try {
        await RoleModel.createEveryoneRole(parseInt(server.id));
      } catch (error) {
        console.error('Failed to create @everyone role:', error);
        // Continue even if role creation fails
      }

      return res.status(201).json({ server });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      console.error('Create server error:', error);
      return res.status(500).json({ error: 'Failed to create server' });
    }
  }

  // Get user's servers
  static async getUserServers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const servers = await ServerModel.getUserServers(req.user.userId);
      return res.json({ servers });
    } catch (error) {
      console.error('Get servers error:', error);
      return res.status(500).json({ error: 'Failed to get servers' });
    }
  }

  // Get server by ID
  static async getServer(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { serverId } = req.params;

      // Check if user is member
      const isMember = await ServerModel.isMember(serverId, req.user.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this server' });
      }

      const server = await ServerModel.findById(serverId);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      // Get channels
      const channels = await ChannelModel.getServerChannels(serverId);

      // Get members
      const members = await ServerModel.getMembers(serverId);

      return res.json({ server, channels, members });
    } catch (error) {
      console.error('Get server error:', error);
      return res.status(500).json({ error: 'Failed to get server' });
    }
  }

  // Update server
  static async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { serverId } = req.params;

      // Check if user is owner
      const isOwner = await ServerModel.isOwner(serverId, req.user.userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Only server owner can update' });
      }

      const data = updateServerSchema.parse(req.body);
      const server = await ServerModel.update(serverId, data);

      return res.json({ server });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      console.error('Update server error:', error);
      return res.status(500).json({ error: 'Failed to update server' });
    }
  }

  // Delete server
  static async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { serverId } = req.params;

      // Check if user is owner
      const isOwner = await ServerModel.isOwner(serverId, req.user.userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Only server owner can delete' });
      }

      await ServerModel.delete(serverId);

      return res.json({ message: 'Server deleted successfully' });
    } catch (error) {
      console.error('Delete server error:', error);
      return res.status(500).json({ error: 'Failed to delete server' });
    }
  }

  // Join server (via invite)
  static async join(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { serverId } = req.params;

      const server = await ServerModel.findById(serverId);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      await ServerModel.addMember(serverId, req.user.userId);

      return res.json({ message: 'Joined server successfully', server });
    } catch (error) {
      console.error('Join server error:', error);
      return res.status(500).json({ error: 'Failed to join server' });
    }
  }

  // Leave server
  static async leave(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { serverId } = req.params;

      // Check if user is owner
      const isOwner = await ServerModel.isOwner(serverId, req.user.userId);
      if (isOwner) {
        return res.status(400).json({ error: 'Server owner cannot leave. Delete the server instead.' });
      }

      await ServerModel.removeMember(serverId, req.user.userId);

      return res.json({ message: 'Left server successfully' });
    } catch (error) {
      console.error('Leave server error:', error);
      return res.status(500).json({ error: 'Failed to leave server' });
    }
  }
}
