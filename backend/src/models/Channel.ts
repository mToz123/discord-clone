// Channel Model
import pool from '../utils/db';

export interface Channel {
  id: string;
  server_id: string;
  parent_id?: string;
  name: string;
  type: 'text' | 'voice' | 'category' | 'announcement';
  topic?: string;
  position: number;
  is_private: boolean;
  slowmode_seconds: number;
  created_at: Date;
}

export class ChannelModel {
  // Create channel
  static async create(
    serverId: string,
    name: string,
    type: 'text' | 'voice' | 'category' | 'announcement',
    options?: {
      parent_id?: string;
      topic?: string;
      position?: number;
      is_private?: boolean;
    }
  ): Promise<Channel> {
    const result = await pool.query(
      `INSERT INTO channels (server_id, name, type, parent_id, topic, position, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        serverId,
        name,
        type,
        options?.parent_id,
        options?.topic,
        options?.position || 0,
        options?.is_private || false,
      ]
    );
    return result.rows[0];
  }

  // Get channel by ID
  static async findById(channelId: string): Promise<Channel | null> {
    const result = await pool.query(
      'SELECT * FROM channels WHERE id = $1',
      [channelId]
    );
    return result.rows[0] || null;
  }

  // Get server channels
  static async getServerChannels(serverId: string): Promise<Channel[]> {
    const result = await pool.query(
      `SELECT * FROM channels
       WHERE server_id = $1
       ORDER BY position ASC, created_at ASC`,
      [serverId]
    );
    return result.rows;
  }

  // Update channel
  static async update(
    channelId: string,
    updates: {
      name?: string;
      topic?: string;
      position?: number;
      is_private?: boolean;
      slowmode_seconds?: number;
    }
  ): Promise<Channel> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.topic !== undefined) {
      fields.push(`topic = $${paramCount++}`);
      values.push(updates.topic);
    }
    if (updates.position !== undefined) {
      fields.push(`position = $${paramCount++}`);
      values.push(updates.position);
    }
    if (updates.is_private !== undefined) {
      fields.push(`is_private = $${paramCount++}`);
      values.push(updates.is_private);
    }
    if (updates.slowmode_seconds !== undefined) {
      fields.push(`slowmode_seconds = $${paramCount++}`);
      values.push(updates.slowmode_seconds);
    }

    values.push(channelId);

    const result = await pool.query(
      `UPDATE channels SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Delete channel
  static async delete(channelId: string): Promise<void> {
    await pool.query('DELETE FROM channels WHERE id = $1', [channelId]);
  }
}
