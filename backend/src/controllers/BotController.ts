import { Request, Response } from 'express';
import { BotModel } from '../models/Bot';
import { z } from 'zod';

// Validation schemas
const createBotSchema = z.object({
  name: z.string().min(2).max(100),
  avatar: z.string().url().optional(),
  prefix: z.string().min(1).max(10).optional(),
  description: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
  permissions: z.array(z.string()).optional()
});

const updateBotSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional().nullable(),
  prefix: z.string().min(1).max(10).optional(),
  description: z.string().max(500).optional().nullable(),
  is_public: z.boolean().optional(),
  permissions: z.array(z.string()).optional()
});

const registerCommandSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  usage: z.string().max(200).optional(),
  cooldown: z.number().int().min(0).max(3600).optional(),
  enabled: z.boolean().optional()
});

const subscribeEventSchema = z.object({
  event_type: z.enum([
    'message.create',
    'message.update',
    'message.delete',
    'member.join',
    'member.leave',
    'reaction.add',
    'reaction.remove',
    'channel.create',
    'channel.update',
    'channel.delete'
  ]),
  webhook_url: z.string().url(),
  secret: z.string().min(8).optional()
});

export class BotController {
  // Create new bot
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = createBotSchema.parse(req.body);

      const bot = await BotModel.create(userId, data.name, {
        avatar: data.avatar,
        prefix: data.prefix,
        description: data.description,
        is_public: data.is_public,
        permissions: data.permissions
      });

      res.status(201).json({
        bot: {
          id: bot.id,
          name: bot.name,
          token: bot.token,
          avatar: bot.avatar,
          prefix: bot.prefix,
          description: bot.description,
          is_public: bot.is_public,
          permissions: bot.permissions,
          created_at: bot.created_at
        },
        message: 'Bot created successfully. Keep your token safe!'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Create bot error:', error);
      res.status(500).json({ error: 'Failed to create bot' });
    }
  }

  // Get all bots for current user
  static async getMyBots(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const bots = await BotModel.findByUserId(userId);

      // Don't expose tokens in list
      const safeBots = bots.map(bot => ({
        id: bot.id,
        name: bot.name,
        avatar: bot.avatar,
        prefix: bot.prefix,
        description: bot.description,
        is_public: bot.is_public,
        permissions: bot.permissions,
        created_at: bot.created_at,
        updated_at: bot.updated_at
      }));

      res.json({ bots: safeBots });
    } catch (error) {
      console.error('Get bots error:', error);
      res.status(500).json({ error: 'Failed to fetch bots' });
    }
  }

  // Get bot by ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      // Only bot owner can see full details including token
      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({ bot });
    } catch (error) {
      console.error('Get bot error:', error);
      res.status(500).json({ error: 'Failed to fetch bot' });
    }
  }

  // Update bot
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const data = updateBotSchema.parse(req.body);
      
      // Filter out null values before passing to update
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.avatar !== undefined && data.avatar !== null) updates.avatar = data.avatar;
      if (data.prefix !== undefined) updates.prefix = data.prefix;
      if (data.description !== undefined && data.description !== null) updates.description = data.description;
      if (data.is_public !== undefined) updates.is_public = data.is_public;
      if (data.permissions !== undefined) updates.permissions = data.permissions;
      
      const updated = await BotModel.update(botId, updates);

      res.json({ bot: updated, message: 'Bot updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Update bot error:', error);
      res.status(500).json({ error: 'Failed to update bot' });
    }
  }

  // Delete bot
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await BotModel.delete(botId);

      res.json({ message: 'Bot deleted successfully' });
    } catch (error) {
      console.error('Delete bot error:', error);
      res.status(500).json({ error: 'Failed to delete bot' });
    }
  }

  // Regenerate bot token
  static async regenerateToken(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const newToken = await BotModel.regenerateToken(botId);

      res.json({ 
        token: newToken, 
        message: 'Token regenerated. Update your bot with the new token.' 
      });
    } catch (error) {
      console.error('Regenerate token error:', error);
      res.status(500).json({ error: 'Failed to regenerate token' });
    }
  }

  // Add bot to server
  static async addToServer(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const serverId = parseInt(req.params.serverId);
      const userId = req.user!.id;

      if (isNaN(botId) || isNaN(serverId)) {
        res.status(400).json({ error: 'Invalid bot or server ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      // Check if user has permission to add bots to server
      // TODO: Check server membership/permissions

      const success = await BotModel.addToServer(serverId, botId, userId);

      if (!success) {
        res.status(500).json({ error: 'Failed to add bot to server' });
        return;
      }

      res.json({ message: 'Bot added to server successfully' });
    } catch (error) {
      console.error('Add bot to server error:', error);
      res.status(500).json({ error: 'Failed to add bot to server' });
    }
  }

  // Remove bot from server
  static async removeFromServer(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const serverId = parseInt(req.params.serverId);
      const userId = req.user!.id;

      if (isNaN(botId) || isNaN(serverId)) {
        res.status(400).json({ error: 'Invalid bot or server ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      // Only bot owner or server admin can remove bot
      // TODO: Check server permissions

      const success = await BotModel.removeFromServer(serverId, botId);

      if (!success) {
        res.status(404).json({ error: 'Bot not found in this server' });
        return;
      }

      res.json({ message: 'Bot removed from server successfully' });
    } catch (error) {
      console.error('Remove bot from server error:', error);
      res.status(500).json({ error: 'Failed to remove bot from server' });
    }
  }

  // Register command
  static async registerCommand(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const data = registerCommandSchema.parse(req.body);
      const command = await BotModel.registerCommand(botId, data.name, {
        description: data.description,
        usage: data.usage,
        cooldown: data.cooldown,
        enabled: data.enabled
      });

      res.status(201).json({ command, message: 'Command registered successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Register command error:', error);
      res.status(500).json({ error: 'Failed to register command' });
    }
  }

  // Get bot commands
  static async getCommands(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const commands = await BotModel.getCommands(botId);

      res.json({ commands });
    } catch (error) {
      console.error('Get commands error:', error);
      res.status(500).json({ error: 'Failed to fetch commands' });
    }
  }

  // Delete command
  static async deleteCommand(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const commandName = req.params.commandName;
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const success = await BotModel.deleteCommand(botId, commandName);

      if (!success) {
        res.status(404).json({ error: 'Command not found' });
        return;
      }

      res.json({ message: 'Command deleted successfully' });
    } catch (error) {
      console.error('Delete command error:', error);
      res.status(500).json({ error: 'Failed to delete command' });
    }
  }

  // Subscribe to event
  static async subscribeEvent(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const data = subscribeEventSchema.parse(req.body);
      const event = await BotModel.subscribeEvent(
        botId,
        data.event_type,
        data.webhook_url,
        data.secret
      );

      res.status(201).json({ event, message: 'Event subscription created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Subscribe event error:', error);
      res.status(500).json({ error: 'Failed to subscribe to event' });
    }
  }

  // Get bot events
  static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const events = await BotModel.getEvents(botId);

      res.json({ events });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  // Unsubscribe from event
  static async unsubscribeEvent(req: Request, res: Response): Promise<void> {
    try {
      const botId = parseInt(req.params.id);
      const eventType = req.params.eventType;
      const userId = req.user!.id;

      if (isNaN(botId)) {
        res.status(400).json({ error: 'Invalid bot ID' });
        return;
      }

      const bot = await BotModel.findById(botId);

      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const success = await BotModel.unsubscribeEvent(botId, eventType);

      if (!success) {
        res.status(404).json({ error: 'Event subscription not found' });
        return;
      }

      res.json({ message: 'Event subscription removed successfully' });
    } catch (error) {
      console.error('Unsubscribe event error:', error);
      res.status(500).json({ error: 'Failed to unsubscribe from event' });
    }
  }
}
