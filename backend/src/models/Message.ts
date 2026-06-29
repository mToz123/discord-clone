// Message Model
import pool from '../utils/db';

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  attachments: any[];
  embeds: any[];
  mentions: any[];
  reply_to?: string;
  edited_at?: Date;
  created_at: Date;
}

export interface MessageWithUser extends Message {
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export class MessageModel {
  // Create message
  static async create(
    channelId: string,
    userId: string,
    content: string,
    options?: {
      attachments?: MessageAttachment[];
      embeds?: any[];
      mentions?: any[];
      reply_to?: string;
    }
  ): Promise<Message> {
    const result = await pool.query(
      `INSERT INTO messages (channel_id, user_id, content, attachments, embeds, mentions, reply_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        channelId,
        userId,
        content,
        JSON.stringify(options?.attachments || []),
        JSON.stringify(options?.embeds || []),
        JSON.stringify(options?.mentions || []),
        options?.reply_to,
      ]
    );
    return result.rows[0];
  }

  // Get message by ID
  static async findById(messageId: string): Promise<MessageWithUser | null> {
    const result = await pool.query(
      `SELECT m.*, 
              json_build_object(
                'id', u.id,
                'username', u.username,
                'avatar_url', u.avatar_url
              ) as user
       FROM messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [messageId]
    );
    return result.rows[0] || null;
  }

  // Get channel messages with pagination
  static async getChannelMessages(
    channelId: string,
    options?: {
      limit?: number;
      before?: string; // message ID
      after?: string; // message ID
    }
  ): Promise<MessageWithUser[]> {
    const limit = options?.limit || 50;
    let query = `
      SELECT m.*, 
             json_build_object(
               'id', u.id,
               'username', u.username,
               'avatar_url', u.avatar_url
             ) as user
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = $1
    `;

    const params: any[] = [channelId];
    let paramCount = 2;

    if (options?.before) {
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $${paramCount})`;
      params.push(options.before);
      paramCount++;
    }

    if (options?.after) {
      query += ` AND m.created_at > (SELECT created_at FROM messages WHERE id = $${paramCount})`;
      params.push(options.after);
      paramCount++;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows.reverse(); // Return oldest first
  }

  // Update message
  static async update(
    messageId: string,
    content: string
  ): Promise<Message> {
    const result = await pool.query(
      `UPDATE messages 
       SET content = $1, edited_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content, messageId]
    );
    return result.rows[0];
  }

  // Delete message
  static async delete(messageId: string): Promise<void> {
    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
  }
}
