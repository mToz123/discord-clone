// Reaction Model
import pool from '../utils/db';

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: Date;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: string[]; // user IDs
  hasReacted: boolean; // if current user has reacted
}

export class ReactionModel {
  // Add reaction
  static async add(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<Reaction> {
    const result = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING
       RETURNING *`,
      [messageId, userId, emoji]
    );
    return result.rows[0];
  }

  // Remove reaction
  static async remove(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    await pool.query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, userId, emoji]
    );
  }

  // Get reactions for a message (grouped by emoji)
  static async getMessageReactions(
    messageId: string,
    currentUserId?: string
  ): Promise<ReactionSummary[]> {
    const result = await pool.query(
      `SELECT 
         emoji,
         COUNT(*) as count,
         array_agg(user_id) as users
       FROM message_reactions
       WHERE message_id = $1
       GROUP BY emoji
       ORDER BY count DESC, MIN(created_at) ASC`,
      [messageId]
    );

    return result.rows.map((row) => ({
      emoji: row.emoji,
      count: parseInt(row.count),
      users: row.users,
      hasReacted: currentUserId ? row.users.includes(currentUserId) : false,
    }));
  }

  // Get all reactions for multiple messages
  static async getMessagesReactions(
    messageIds: string[],
    currentUserId?: string
  ): Promise<{ [messageId: string]: ReactionSummary[] }> {
    if (messageIds.length === 0) return {};

    const result = await pool.query(
      `SELECT 
         message_id,
         emoji,
         COUNT(*) as count,
         array_agg(user_id) as users
       FROM message_reactions
       WHERE message_id = ANY($1)
       GROUP BY message_id, emoji
       ORDER BY message_id, count DESC`,
      [messageIds]
    );

    const grouped: { [messageId: string]: ReactionSummary[] } = {};

    result.rows.forEach((row) => {
      if (!grouped[row.message_id]) {
        grouped[row.message_id] = [];
      }
      grouped[row.message_id].push({
        emoji: row.emoji,
        count: parseInt(row.count),
        users: row.users,
        hasReacted: currentUserId ? row.users.includes(currentUserId) : false,
      });
    });

    return grouped;
  }
}
