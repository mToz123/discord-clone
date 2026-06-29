// Server Model
import pool from '../utils/db';

export interface Server {
  id: string;
  name: string;
  icon_url?: string;
  banner_url?: string;
  description?: string;
  owner_id: string;
  vanity_url?: string;
  created_at: Date;
  updated_at: Date;
}

export class ServerModel {
  // Create server
  static async create(
    name: string,
    ownerId: string,
    options?: {
      icon_url?: string;
      description?: string;
    }
  ): Promise<Server> {
    const result = await pool.query(
      `INSERT INTO servers (name, owner_id, icon_url, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, ownerId, options?.icon_url, options?.description]
    );

    const server = result.rows[0];

    // Add owner as member
    await pool.query(
      `INSERT INTO server_members (server_id, user_id)
       VALUES ($1, $2)`,
      [server.id, ownerId]
    );

    // Create default "general" channel
    await pool.query(
      `INSERT INTO channels (server_id, name, type, position)
       VALUES ($1, $2, $3, $4)`,
      [server.id, 'general', 'text', 0]
    );

    return server;
  }

  // Get server by ID
  static async findById(serverId: string): Promise<Server | null> {
    const result = await pool.query(
      'SELECT * FROM servers WHERE id = $1',
      [serverId]
    );
    return result.rows[0] || null;
  }

  // Get user's servers
  static async getUserServers(userId: string): Promise<Server[]> {
    const result = await pool.query(
      `SELECT s.* FROM servers s
       INNER JOIN server_members sm ON s.id = sm.server_id
       WHERE sm.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Update server
  static async update(
    serverId: string,
    updates: {
      name?: string;
      icon_url?: string;
      banner_url?: string;
      description?: string;
    }
  ): Promise<Server> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.icon_url !== undefined) {
      fields.push(`icon_url = $${paramCount++}`);
      values.push(updates.icon_url);
    }
    if (updates.banner_url !== undefined) {
      fields.push(`banner_url = $${paramCount++}`);
      values.push(updates.banner_url);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    fields.push(`updated_at = NOW()`);
    values.push(serverId);

    const result = await pool.query(
      `UPDATE servers SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Delete server
  static async delete(serverId: string): Promise<void> {
    await pool.query('DELETE FROM servers WHERE id = $1', [serverId]);
  }

  // Add member to server
  static async addMember(serverId: string, userId: string): Promise<void> {
    await pool.query(
      `INSERT INTO server_members (server_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [serverId, userId]
    );
  }

  // Remove member from server
  static async removeMember(serverId: string, userId: string): Promise<void> {
    await pool.query(
      'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
  }

  // Get server members
  static async getMembers(serverId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.avatar_url, u.status, sm.joined_at
       FROM users u
       INNER JOIN server_members sm ON u.id = sm.user_id
       WHERE sm.server_id = $1
       ORDER BY sm.joined_at ASC`,
      [serverId]
    );
    return result.rows;
  }

  // Check if user is member
  static async isMember(serverId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return result.rows.length > 0;
  }

  // Check if user is owner
  static async isOwner(serverId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM servers WHERE id = $1 AND owner_id = $2',
      [serverId, userId]
    );
    return result.rows.length > 0;
  }
}
