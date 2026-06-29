// Presence tracking utilities
import pool from './db';

export class PresenceUtil {
  // Update user status
  static async updateStatus(userId: string, status: 'online' | 'idle' | 'dnd' | 'offline'): Promise<void> {
    await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, userId]
    );
  }

  // Get online users in server
  static async getServerOnlineUsers(serverId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT u.id
       FROM users u
       INNER JOIN server_members sm ON u.id = sm.user_id
       WHERE sm.server_id = $1 AND u.status != 'offline'`,
      [serverId]
    );
    return result.rows.map((r) => r.id);
  }

  // Heartbeat (keep user online)
  static async heartbeat(userId: string): Promise<void> {
    await pool.query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [userId]
    );
  }

  // Mark users offline if no heartbeat for 5 minutes
  static async cleanupStalePresence(): Promise<void> {
    await pool.query(
      `UPDATE users
       SET status = 'offline'
       WHERE status != 'offline'
       AND updated_at < NOW() - INTERVAL '5 minutes'`
    );
  }
}
