import pool from '../utils/db';

export interface MessageEmbed {
  id: number;
  message_id: number;
  type: string;
  title?: string;
  description?: string;
  url?: string;
  color?: string;
  thumbnail_url?: string;
  image_url?: string;
  footer_text?: string;
  footer_icon_url?: string;
  author_name?: string;
  author_url?: string;
  author_icon_url?: string;
  fields: any[];
  created_at: Date;
}

export interface PinnedMessage {
  id: number;
  message_id: number;
  channel_id: number;
  pinned_by: number;
  pinned_at: Date;
}

export class EmbedModel {
  // Create embed
  static async create(messageId: number, embed: Partial<MessageEmbed>): Promise<MessageEmbed> {
    const result = await pool.query(
      `INSERT INTO message_embeds (
        message_id, type, title, description, url, color,
        thumbnail_url, image_url, footer_text, footer_icon_url,
        author_name, author_url, author_icon_url, fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        messageId,
        embed.type || 'rich',
        embed.title,
        embed.description,
        embed.url,
        embed.color,
        embed.thumbnail_url,
        embed.image_url,
        embed.footer_text,
        embed.footer_icon_url,
        embed.author_name,
        embed.author_url,
        embed.author_icon_url,
        JSON.stringify(embed.fields || [])
      ]
    );

    return result.rows[0];
  }

  // Get embeds for message
  static async getByMessageId(messageId: number): Promise<MessageEmbed[]> {
    const result = await pool.query(
      'SELECT * FROM message_embeds WHERE message_id = $1',
      [messageId]
    );

    return result.rows;
  }

  // Delete embeds for message
  static async deleteByMessageId(messageId: number): Promise<void> {
    await pool.query('DELETE FROM message_embeds WHERE message_id = $1', [messageId]);
  }
}

export class PinModel {
  // Pin message
  static async pin(messageId: number, channelId: number, userId: number): Promise<PinnedMessage> {
    const result = await pool.query(
      `INSERT INTO pinned_messages (message_id, channel_id, pinned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id) DO NOTHING
       RETURNING *`,
      [messageId, channelId, userId]
    );

    return result.rows[0];
  }

  // Unpin message
  static async unpin(messageId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM pinned_messages WHERE message_id = $1',
      [messageId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // Get pinned messages for channel
  static async getByChannelId(channelId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT pm.*, m.content, m.created_at as message_created_at,
              json_build_object(
                'id', u.id,
                'username', u.username,
                'avatar_url', u.avatar_url
              ) as user
       FROM pinned_messages pm
       JOIN messages m ON pm.message_id = m.id
       JOIN users u ON m.user_id = u.id
       WHERE pm.channel_id = $1
       ORDER BY pm.pinned_at DESC
       LIMIT 50`,
      [channelId]
    );

    return result.rows;
  }

  // Check if message is pinned
  static async isPinned(messageId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM pinned_messages WHERE message_id = $1',
      [messageId]
    );

    return result.rows.length > 0;
  }

  // Get pin count for channel
  static async getCount(channelId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*)::int as count FROM pinned_messages WHERE channel_id = $1',
      [channelId]
    );

    return result.rows[0]?.count || 0;
  }
}

export class MentionModel {
  // Add mention
  static async add(messageId: number, userId: number): Promise<void> {
    await pool.query(
      `INSERT INTO message_mentions (message_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [messageId, userId]
    );
  }

  // Add multiple mentions
  static async addMultiple(messageId: number, userIds: number[]): Promise<void> {
    if (userIds.length === 0) return;

    const values = userIds.map((userId, i) => `($1, $${i + 2})`).join(', ');
    const params = [messageId, ...userIds];

    await pool.query(
      `INSERT INTO message_mentions (message_id, user_id)
       VALUES ${values}
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      params
    );
  }

  // Get mentions for message
  static async getByMessageId(messageId: number): Promise<number[]> {
    const result = await pool.query(
      'SELECT user_id FROM message_mentions WHERE message_id = $1',
      [messageId]
    );

    return result.rows.map(row => row.user_id);
  }

  // Get messages mentioning user (for notifications)
  static async getUnreadMentions(userId: number, limit: number = 50): Promise<any[]> {
    const result = await pool.query(
      `SELECT m.*, mm.created_at as mention_created_at,
              json_build_object(
                'id', u.id,
                'username', u.username,
                'avatar_url', u.avatar_url
              ) as author
       FROM message_mentions mm
       JOIN messages m ON mm.message_id = m.id
       JOIN users u ON m.user_id = u.id
       WHERE mm.user_id = $1
       ORDER BY mm.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }
}

export class SearchModel {
  // Search messages in channel
  static async searchInChannel(
    channelId: string,
    query: string,
    options?: {
      userId?: string;
      before?: Date;
      after?: Date;
      limit?: number;
    }
  ): Promise<any[]> {
    const limit = options?.limit || 50;
    let queryStr = `
      SELECT m.*, 
             ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $2)) as rank,
             json_build_object(
               'id', u.id,
               'username', u.username,
               'avatar_url', u.avatar_url
             ) as user
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = $1
        AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
    `;

    const params: any[] = [channelId, query];
    let paramCount = 3;

    if (options?.userId) {
      queryStr += ` AND m.user_id = $${paramCount}`;
      params.push(options.userId);
      paramCount++;
    }

    if (options?.before) {
      queryStr += ` AND m.created_at < $${paramCount}`;
      params.push(options.before);
      paramCount++;
    }

    if (options?.after) {
      queryStr += ` AND m.created_at > $${paramCount}`;
      params.push(options.after);
      paramCount++;
    }

    queryStr += ` ORDER BY rank DESC, m.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(queryStr, params);
    return result.rows;
  }

  // Search messages in server
  static async searchInServer(
    serverId: string,
    query: string,
    options?: {
      userId?: string;
      channelId?: string;
      before?: Date;
      after?: Date;
      limit?: number;
    }
  ): Promise<any[]> {
    const limit = options?.limit || 50;
    let queryStr = `
      SELECT m.*, 
             ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $2)) as rank,
             json_build_object(
               'id', u.id,
               'username', u.username,
               'avatar_url', u.avatar_url
             ) as user,
             json_build_object(
               'id', c.id,
               'name', c.name
             ) as channel
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN channels c ON m.channel_id = c.id
      WHERE c.server_id = $1
        AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
    `;

    const params: any[] = [serverId, query];
    let paramCount = 3;

    if (options?.userId) {
      queryStr += ` AND m.user_id = $${paramCount}`;
      params.push(options.userId);
      paramCount++;
    }

    if (options?.channelId) {
      queryStr += ` AND m.channel_id = $${paramCount}`;
      params.push(options.channelId);
      paramCount++;
    }

    if (options?.before) {
      queryStr += ` AND m.created_at < $${paramCount}`;
      params.push(options.before);
      paramCount++;
    }

    if (options?.after) {
      queryStr += ` AND m.created_at > $${paramCount}`;
      params.push(options.after);
      paramCount++;
    }

    queryStr += ` ORDER BY rank DESC, m.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(queryStr, params);
    return result.rows;
  }
}
