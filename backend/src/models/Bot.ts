import pool from '../utils/db';
import crypto from 'crypto';

export interface Bot {
  id: number;
  user_id: number;
  name: string;
  token: string;
  avatar?: string;
  prefix: string;
  description?: string;
  is_public: boolean;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface BotCommand {
  id: number;
  bot_id: number;
  name: string;
  description?: string;
  usage?: string;
  cooldown: number;
  enabled: boolean;
  created_at: Date;
}

export interface BotEvent {
  id: number;
  bot_id: number;
  event_type: string;
  webhook_url: string;
  secret?: string;
  enabled: boolean;
  created_at: Date;
}

export class BotModel {
  // Generate secure bot token
  static generateToken(): string {
    return `bot_${crypto.randomBytes(32).toString('hex')}`;
  }

  // Create new bot
  static async create(
    userId: number,
    name: string,
    options: {
      avatar?: string;
      prefix?: string;
      description?: string;
      is_public?: boolean;
      permissions?: string[];
    } = {}
  ): Promise<Bot> {
    const token = this.generateToken();
    const {
      avatar = null,
      prefix = '!',
      description = null,
      is_public = true,
      permissions = ['read_messages', 'send_messages']
    } = options;

    const result = await pool.query(
      `INSERT INTO bots (user_id, name, token, avatar, prefix, description, is_public, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, name, token, avatar, prefix, description, is_public, permissions]
    );

    return result.rows[0];
  }

  // Get bot by ID
  static async findById(botId: number): Promise<Bot | null> {
    const result = await pool.query('SELECT * FROM bots WHERE id = $1', [botId]);
    return result.rows[0] || null;
  }

  // Get bot by token
  static async findByToken(token: string): Promise<Bot | null> {
    const result = await pool.query('SELECT * FROM bots WHERE token = $1', [token]);
    return result.rows[0] || null;
  }

  // Get all bots by user
  static async findByUserId(userId: number): Promise<Bot[]> {
    const result = await pool.query(
      'SELECT * FROM bots WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  // Update bot
  static async update(
    botId: number,
    updates: {
      name?: string;
      avatar?: string;
      prefix?: string;
      description?: string;
      is_public?: boolean;
      permissions?: string[];
    }
  ): Promise<Bot | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(botId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(botId);

    const result = await pool.query(
      `UPDATE bots SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  // Delete bot
  static async delete(botId: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM bots WHERE id = $1', [botId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Regenerate bot token
  static async regenerateToken(botId: number): Promise<string> {
    const newToken = this.generateToken();
    await pool.query('UPDATE bots SET token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      newToken,
      botId
    ]);
    return newToken;
  }

  // Add bot to server
  static async addToServer(serverId: number, botId: number, addedBy: number): Promise<boolean> {
    try {
      await pool.query(
        `INSERT INTO server_bots (server_id, bot_id, added_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (server_id, bot_id) DO NOTHING`,
        [serverId, botId, addedBy]
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  // Remove bot from server
  static async removeFromServer(serverId: number, botId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM server_bots WHERE server_id = $1 AND bot_id = $2',
      [serverId, botId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Get servers where bot is added
  static async getServers(botId: number): Promise<number[]> {
    const result = await pool.query(
      'SELECT server_id FROM server_bots WHERE bot_id = $1',
      [botId]
    );
    return result.rows.map((row: any) => row.server_id);
  }

  // Register command
  static async registerCommand(
    botId: number,
    name: string,
    options: {
      description?: string;
      usage?: string;
      cooldown?: number;
      enabled?: boolean;
    } = {}
  ): Promise<BotCommand> {
    const { description = null, usage = null, cooldown = 0, enabled = true } = options;

    const result = await pool.query(
      `INSERT INTO bot_commands (bot_id, name, description, usage, cooldown, enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (bot_id, name) DO UPDATE
       SET description = $3, usage = $4, cooldown = $5, enabled = $6
       RETURNING *`,
      [botId, name, description, usage, cooldown, enabled]
    );

    return result.rows[0];
  }

  // Get bot commands
  static async getCommands(botId: number): Promise<BotCommand[]> {
    const result = await pool.query(
      'SELECT * FROM bot_commands WHERE bot_id = $1 ORDER BY name',
      [botId]
    );
    return result.rows;
  }

  // Delete command
  static async deleteCommand(botId: number, commandName: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM bot_commands WHERE bot_id = $1 AND name = $2',
      [botId, commandName]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Subscribe to event
  static async subscribeEvent(
    botId: number,
    eventType: string,
    webhookUrl: string,
    secret?: string
  ): Promise<BotEvent> {
    const result = await pool.query(
      `INSERT INTO bot_events (bot_id, event_type, webhook_url, secret)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (bot_id, event_type) DO UPDATE
       SET webhook_url = $3, secret = $4, enabled = true
       RETURNING *`,
      [botId, eventType, webhookUrl, secret]
    );

    return result.rows[0];
  }

  // Get bot events
  static async getEvents(botId: number): Promise<BotEvent[]> {
    const result = await pool.query(
      'SELECT * FROM bot_events WHERE bot_id = $1 ORDER BY event_type',
      [botId]
    );
    return result.rows;
  }

  // Unsubscribe from event
  static async unsubscribeEvent(botId: number, eventType: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM bot_events WHERE bot_id = $1 AND event_type = $2',
      [botId, eventType]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Get active webhooks for event type
  static async getActiveWebhooks(eventType: string, serverId?: number): Promise<BotEvent[]> {
    let query = `
      SELECT be.* 
      FROM bot_events be
      WHERE be.event_type = $1 AND be.enabled = true
    `;
    
    const params: any[] = [eventType];

    if (serverId) {
      query += ` AND EXISTS (
        SELECT 1 FROM server_bots sb 
        WHERE sb.bot_id = be.bot_id AND sb.server_id = $2
      )`;
      params.push(serverId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}
