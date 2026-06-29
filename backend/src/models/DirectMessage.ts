import pool from '../utils/db';

export interface DMConversation {
  id: number;
  created_at: Date;
  updated_at: Date;
  // Populated fields
  other_user?: {
    id: number;
    username: string;
    avatar_url?: string;
    status?: string;
  };
  last_message?: {
    content: string;
    created_at: Date;
    sender_id: number;
  };
  unread_count?: number;
}

export interface DMMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  attachments: any[];
  edited_at?: Date;
  deleted_at?: Date;
  created_at: Date;
  // Populated
  sender?: {
    id: number;
    username: string;
    avatar_url?: string;
  };
}

export class DirectMessageModel {
  // Get or create DM conversation between two users
  static async getOrCreateConversation(userId1: number, userId2: number): Promise<DMConversation> {
    // Check if conversation already exists
    const existing = await pool.query(
      `SELECT dc.* FROM dm_conversations dc
       JOIN dm_participants p1 ON dc.id = p1.conversation_id AND p1.user_id = $1
       JOIN dm_participants p2 ON dc.id = p2.conversation_id AND p2.user_id = $2
       LIMIT 1`,
      [userId1, userId2]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    // Create new conversation
    const result = await pool.query(
      'INSERT INTO dm_conversations DEFAULT VALUES RETURNING *'
    );
    const conversation = result.rows[0];

    // Add both participants
    await pool.query(
      'INSERT INTO dm_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [conversation.id, userId1, userId2]
    );

    return conversation;
  }

  // Get all DM conversations for a user
  static async getUserConversations(userId: number): Promise<DMConversation[]> {
    const result = await pool.query(
      `SELECT 
        dc.id,
        dc.created_at,
        dc.updated_at,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'avatar_url', u.avatar_url,
          'status', u.status
        ) as other_user,
        (
          SELECT json_build_object(
            'content', m.content,
            'created_at', m.created_at,
            'sender_id', m.sender_id
          )
          FROM dm_messages m
          WHERE m.conversation_id = dc.id AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*)::int
          FROM dm_messages m
          WHERE m.conversation_id = dc.id
            AND m.created_at > p_self.last_read_at
            AND m.sender_id != $1
            AND m.deleted_at IS NULL
        ) as unread_count
       FROM dm_conversations dc
       JOIN dm_participants p_self ON dc.id = p_self.conversation_id AND p_self.user_id = $1
       JOIN dm_participants p_other ON dc.id = p_other.conversation_id AND p_other.user_id != $1
       JOIN users u ON p_other.user_id = u.id
       ORDER BY dc.updated_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // Get conversation by ID
  static async findById(conversationId: number, userId: number): Promise<DMConversation | null> {
    const result = await pool.query(
      `SELECT dc.*
       FROM dm_conversations dc
       JOIN dm_participants p ON dc.id = p.conversation_id AND p.user_id = $2
       WHERE dc.id = $1`,
      [conversationId, userId]
    );

    return result.rows[0] || null;
  }

  // Send DM message
  static async sendMessage(
    conversationId: number,
    senderId: number,
    content: string,
    attachments?: any[]
  ): Promise<DMMessage> {
    const result = await pool.query(
      `INSERT INTO dm_messages (conversation_id, sender_id, content, attachments)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [conversationId, senderId, content, JSON.stringify(attachments || [])]
    );

    // Update conversation updated_at
    await pool.query(
      'UPDATE dm_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    // Get message with sender info
    const message = await this.findMessageById(result.rows[0].id);
    return message!;
  }

  // Get message by ID
  static async findMessageById(messageId: number): Promise<DMMessage | null> {
    const result = await pool.query(
      `SELECT m.*,
              json_build_object(
                'id', u.id,
                'username', u.username,
                'avatar_url', u.avatar_url
              ) as sender
       FROM dm_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1`,
      [messageId]
    );

    return result.rows[0] || null;
  }

  // Get messages in conversation
  static async getMessages(
    conversationId: number,
    options?: { limit?: number; before?: number }
  ): Promise<DMMessage[]> {
    const limit = options?.limit || 50;
    let query = `
      SELECT m.*,
             json_build_object(
               'id', u.id,
               'username', u.username,
               'avatar_url', u.avatar_url
             ) as sender
      FROM dm_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
    `;

    const params: any[] = [conversationId];

    if (options?.before) {
      query += ` AND m.id < $2 ORDER BY m.created_at DESC LIMIT $3`;
      params.push(options.before, limit);
    } else {
      query += ` ORDER BY m.created_at DESC LIMIT $2`;
      params.push(limit);
    }

    const result = await pool.query(query, params);
    return result.rows.reverse();
  }

  // Edit DM message
  static async editMessage(messageId: number, senderId: number, content: string): Promise<DMMessage | null> {
    const result = await pool.query(
      `UPDATE dm_messages
       SET content = $1, edited_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND sender_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [content, messageId, senderId]
    );

    if (!result.rows[0]) return null;
    return this.findMessageById(messageId);
  }

  // Delete DM message (soft delete)
  static async deleteMessage(messageId: number, senderId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE dm_messages
       SET deleted_at = CURRENT_TIMESTAMP, content = '[Message deleted]'
       WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL`,
      [messageId, senderId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // Mark conversation as read
  static async markAsRead(conversationId: number, userId: number): Promise<void> {
    await pool.query(
      `UPDATE dm_participants
       SET last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
  }

  // Get unread count for user
  static async getUnreadCount(userId: number): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int as count
       FROM dm_messages m
       JOIN dm_participants p ON m.conversation_id = p.conversation_id
       WHERE p.user_id = $1
         AND m.sender_id != $1
         AND m.created_at > p.last_read_at
         AND m.deleted_at IS NULL`,
      [userId]
    );

    return result.rows[0]?.count || 0;
  }
}

export class FriendshipModel {
  // Send friend request
  static async sendRequest(requesterId: number, addresseeId: number): Promise<any> {
    const result = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (requester_id, addressee_id) DO NOTHING
       RETURNING *`,
      [requesterId, addresseeId]
    );

    return result.rows[0];
  }

  // Accept friend request
  static async acceptRequest(requesterId: number, addresseeId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE friendships
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [requesterId, addresseeId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // Decline/remove friend
  static async removeFriend(userId1: number, userId2: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [userId1, userId2]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // Block user
  static async blockUser(blockerId: number, blockedId: number): Promise<void> {
    await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'blocked')
       ON CONFLICT (requester_id, addressee_id)
       DO UPDATE SET status = 'blocked', updated_at = CURRENT_TIMESTAMP`,
      [blockerId, blockedId]
    );
  }

  // Get friends list
  static async getFriends(userId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        f.*,
        CASE 
          WHEN f.requester_id = $1 THEN json_build_object('id', u2.id, 'username', u2.username, 'avatar_url', u2.avatar_url, 'status', u2.status)
          ELSE json_build_object('id', u1.id, 'username', u1.username, 'avatar_url', u1.avatar_url, 'status', u1.status)
        END as friend
       FROM friendships f
       JOIN users u1 ON f.requester_id = u1.id
       JOIN users u2 ON f.addressee_id = u2.id
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
         AND f.status = 'accepted'
       ORDER BY u2.username`,
      [userId]
    );

    return result.rows;
  }

  // Get pending friend requests
  static async getPendingRequests(userId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT f.*,
              json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as requester
       FROM friendships f
       JOIN users u ON f.requester_id = u.id
       WHERE f.addressee_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // Get friendship status
  static async getStatus(userId1: number, userId2: number): Promise<string | null> {
    const result = await pool.query(
      `SELECT status FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)
       LIMIT 1`,
      [userId1, userId2]
    );

    return result.rows[0]?.status || null;
  }

  // Check if friends
  static async areFriends(userId1: number, userId2: number): Promise<boolean> {
    const status = await this.getStatus(userId1, userId2);
    return status === 'accepted';
  }

  // Check if blocked
  static async isBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM friendships
       WHERE requester_id = $1 AND addressee_id = $2 AND status = 'blocked'`,
      [blockerId, blockedId]
    );

    return result.rows.length > 0;
  }
}
