// User Model
import pool from '../utils/db';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url?: string;
  bio?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  created_at: Date;
  updated_at: Date;
}

export interface UserSafe {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  status: string;
  created_at: Date;
}

export class UserModel {
  // Create new user
  static async create(
    username: string,
    email: string,
    password: string
  ): Promise<UserSafe> {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, status)
       VALUES ($1, $2, $3, 'offline')
       RETURNING id, username, email, avatar_url, bio, status, created_at`,
      [username, email, passwordHash]
    );

    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  // Find user by username
  static async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    return result.rows[0] || null;
  }

  // Find user by ID
  static async findById(id: string): Promise<UserSafe | null> {
    const result = await pool.query(
      `SELECT id, username, email, avatar_url, bio, status, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  // Update user status
  static async updateStatus(
    userId: string,
    status: 'online' | 'idle' | 'dnd' | 'offline'
  ): Promise<void> {
    await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, userId]
    );
  }

  // Update user profile
  static async updateProfile(
    userId: string,
    updates: { username?: string; bio?: string; avatar_url?: string }
  ): Promise<UserSafe> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.username) {
      fields.push(`username = $${paramCount++}`);
      values.push(updates.username);
    }
    if (updates.bio !== undefined) {
      fields.push(`bio = $${paramCount++}`);
      values.push(updates.bio);
    }
    if (updates.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramCount++}`);
      values.push(updates.avatar_url);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, avatar_url, bio, status, created_at`,
      values
    );

    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(
    user: User,
    password: string
  ): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  // Remove password from user object
  static sanitize(user: User): UserSafe {
    const { password_hash, updated_at, ...safe } = user;
    return safe;
  }
}
