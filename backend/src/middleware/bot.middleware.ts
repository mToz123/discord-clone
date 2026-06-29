import { Request, Response, NextFunction } from 'express';
import { BotModel } from '../models/Bot';

// Extend Express Request to include bot
declare global {
  namespace Express {
    interface Request {
      bot?: {
        id: number;
        name: string;
        user_id: number;
        permissions: string[];
      };
    }
  }
}

// Bot authentication middleware
export const authenticateBot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bot ')) {
      res.status(401).json({ error: 'Bot token required. Use: Authorization: Bot <token>' });
      return;
    }

    const token = authHeader.substring(4); // Remove 'Bot ' prefix

    // Verify token
    const bot = await BotModel.findByToken(token);

    if (!bot) {
      res.status(401).json({ error: 'Invalid bot token' });
      return;
    }

    // Attach bot info to request
    req.bot = {
      id: bot.id,
      name: bot.name,
      user_id: bot.user_id,
      permissions: bot.permissions
    };

    next();
  } catch (error) {
    console.error('Bot authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check bot permission
export const requireBotPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.bot) {
      res.status(401).json({ error: 'Bot authentication required' });
      return;
    }

    if (!req.bot.permissions.includes(permission)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        has: req.bot.permissions
      });
      return;
    }

    next();
  };
};

// Check if bot is added to server
export const requireBotInServer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.bot) {
      res.status(401).json({ error: 'Bot authentication required' });
      return;
    }

    const serverId = parseInt(req.params.serverId);

    if (isNaN(serverId)) {
      res.status(400).json({ error: 'Invalid server ID' });
      return;
    }

    const servers = await BotModel.getServers(req.bot.id);

    if (!servers.includes(serverId)) {
      res.status(403).json({ error: 'Bot not added to this server' });
      return;
    }

    next();
  } catch (error) {
    console.error('Bot server check error:', error);
    res.status(500).json({ error: 'Server check failed' });
  }
};
