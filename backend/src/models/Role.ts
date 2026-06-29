import pool from '../utils/db';
import { Permission, PermissionUtil, DEFAULT_PERMISSIONS } from '../utils/permissions';

export interface ServerRole {
  id: number;
  server_id: number;
  name: string;
  color?: string;
  position: number;
  permissions: bigint;
  mentionable: boolean;
  hoist: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ChannelPermissionOverride {
  id: number;
  channel_id: number;
  role_id?: number;
  user_id?: number;
  allow: bigint;
  deny: bigint;
  created_at: Date;
}

export class RoleModel {
  // Create role
  static async create(
    serverId: number,
    name: string,
    options: {
      color?: string;
      position?: number;
      permissions?: bigint;
      mentionable?: boolean;
      hoist?: boolean;
    } = {}
  ): Promise<ServerRole> {
    const result = await pool.query(
      `INSERT INTO server_roles (server_id, name, color, position, permissions, mentionable, hoist)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        serverId,
        name,
        options.color,
        options.position || 0,
        (options.permissions || DEFAULT_PERMISSIONS).toString(),
        options.mentionable || false,
        options.hoist || false
      ]
    );

    const role = result.rows[0];
    role.permissions = BigInt(role.permissions);
    return role;
  }

  // Get role by ID
  static async findById(roleId: number): Promise<ServerRole | null> {
    const result = await pool.query('SELECT * FROM server_roles WHERE id = $1', [roleId]);
    
    if (!result.rows[0]) return null;

    const role = result.rows[0];
    role.permissions = BigInt(role.permissions);
    return role;
  }

  // Get all roles for server
  static async getByServerId(serverId: number): Promise<ServerRole[]> {
    const result = await pool.query(
      'SELECT * FROM server_roles WHERE server_id = $1 ORDER BY position DESC',
      [serverId]
    );

    return result.rows.map(role => ({
      ...role,
      permissions: BigInt(role.permissions)
    }));
  }

  // Update role
  static async update(
    roleId: number,
    updates: {
      name?: string;
      color?: string;
      position?: number;
      permissions?: bigint;
      mentionable?: boolean;
      hoist?: boolean;
    }
  ): Promise<ServerRole | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(key === 'permissions' && typeof value === 'bigint' ? value.toString() : value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return this.findById(roleId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(roleId);

    const result = await pool.query(
      `UPDATE server_roles SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (!result.rows[0]) return null;

    const role = result.rows[0];
    role.permissions = BigInt(role.permissions);
    return role;
  }

  // Delete role
  static async delete(roleId: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM server_roles WHERE id = $1', [roleId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Assign role to user
  static async assignToUser(userId: number, roleId: number): Promise<void> {
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId]
    );
  }

  // Remove role from user
  static async removeFromUser(userId: number, roleId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Get user's roles in server
  static async getUserRoles(userId: number, serverId: number): Promise<ServerRole[]> {
    const result = await pool.query(
      `SELECT sr.* FROM server_roles sr
       JOIN user_roles ur ON sr.id = ur.role_id
       WHERE ur.user_id = $1 AND sr.server_id = $2
       ORDER BY sr.position DESC`,
      [userId, serverId]
    );

    return result.rows.map(role => ({
      ...role,
      permissions: BigInt(role.permissions)
    }));
  }

  // Get members with role
  static async getMembersWithRole(roleId: number): Promise<number[]> {
    const result = await pool.query(
      'SELECT user_id FROM user_roles WHERE role_id = $1',
      [roleId]
    );

    return result.rows.map(row => row.user_id);
  }

  // Calculate user permissions in server (base permissions)
  static async calculateUserPermissions(userId: number, serverId: number): Promise<bigint> {
    const roles = await this.getUserRoles(userId, serverId);
    
    if (roles.length === 0) {
      // Get @everyone role
      const everyoneRole = await pool.query(
        'SELECT permissions FROM server_roles WHERE server_id = $1 AND name = $2',
        [serverId, '@everyone']
      );
      
      if (everyoneRole.rows[0]) {
        return BigInt(everyoneRole.rows[0].permissions);
      }
      
      return DEFAULT_PERMISSIONS;
    }

    // Start with @everyone permissions
    const everyoneRole = await pool.query(
      'SELECT permissions FROM server_roles WHERE server_id = $1 AND name = $2',
      [serverId, '@everyone']
    );
    
    let permissions = everyoneRole.rows[0] 
      ? BigInt(everyoneRole.rows[0].permissions) 
      : DEFAULT_PERMISSIONS;

    // Combine all role permissions
    for (const role of roles) {
      permissions = permissions | role.permissions;
      
      // If any role has administrator, return all permissions
      if (PermissionUtil.has(role.permissions, Permission.ADMINISTRATOR)) {
        return Permission.ADMINISTRATOR;
      }
    }

    return permissions;
  }

  // Calculate user permissions in channel (with overrides)
  static async calculateChannelPermissions(
    userId: number,
    channelId: number,
    serverId: number
  ): Promise<bigint> {
    // Get base permissions
    let permissions = await this.calculateUserPermissions(userId, serverId);

    // Administrator bypasses all overrides
    if (PermissionUtil.has(permissions, Permission.ADMINISTRATOR)) {
      return permissions;
    }

    // Get user's roles
    const roles = await this.getUserRoles(userId, serverId);
    const roleIds = roles.map(r => r.id);

    // Get @everyone role
    const everyoneRole = await pool.query(
      'SELECT id FROM server_roles WHERE server_id = $1 AND name = $2',
      [serverId, '@everyone']
    );

    if (everyoneRole.rows[0]) {
      roleIds.push(everyoneRole.rows[0].id);
    }

    // Get channel overrides for roles
    if (roleIds.length > 0) {
      const roleOverrides = await pool.query(
        `SELECT allow, deny FROM channel_permissions
         WHERE channel_id = $1 AND role_id = ANY($2)
         ORDER BY (SELECT position FROM server_roles WHERE id = role_id) ASC`,
        [channelId, roleIds]
      );

      for (const override of roleOverrides.rows) {
        const allow = BigInt(override.allow);
        const deny = BigInt(override.deny);
        permissions = PermissionUtil.calculate(permissions, allow, deny);
      }
    }

    // Get user-specific override (highest priority)
    const userOverride = await pool.query(
      'SELECT allow, deny FROM channel_permissions WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );

    if (userOverride.rows[0]) {
      const allow = BigInt(userOverride.rows[0].allow);
      const deny = BigInt(userOverride.rows[0].deny);
      permissions = PermissionUtil.calculate(permissions, allow, deny);
    }

    return permissions;
  }

  // Create @everyone role for server
  static async createEveryoneRole(serverId: number): Promise<ServerRole> {
    return this.create(serverId, '@everyone', {
      position: 0,
      permissions: DEFAULT_PERMISSIONS,
      mentionable: false,
      hoist: false
    });
  }
}

export class ChannelPermissionModel {
  // Set role override
  static async setRoleOverride(
    channelId: number,
    roleId: number,
    allow: bigint,
    deny: bigint
  ): Promise<ChannelPermissionOverride> {
    const result = await pool.query(
      `INSERT INTO channel_permissions (channel_id, role_id, allow, deny)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (channel_id, role_id)
       DO UPDATE SET allow = $3, deny = $4
       RETURNING *`,
      [channelId, roleId, allow.toString(), deny.toString()]
    );

    const override = result.rows[0];
    override.allow = BigInt(override.allow);
    override.deny = BigInt(override.deny);
    return override;
  }

  // Set user override
  static async setUserOverride(
    channelId: number,
    userId: number,
    allow: bigint,
    deny: bigint
  ): Promise<ChannelPermissionOverride> {
    const result = await pool.query(
      `INSERT INTO channel_permissions (channel_id, user_id, allow, deny)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (channel_id, user_id)
       DO UPDATE SET allow = $3, deny = $4
       RETURNING *`,
      [channelId, userId, allow.toString(), deny.toString()]
    );

    const override = result.rows[0];
    override.allow = BigInt(override.allow);
    override.deny = BigInt(override.deny);
    return override;
  }

  // Get channel overrides
  static async getByChannelId(channelId: number): Promise<ChannelPermissionOverride[]> {
    const result = await pool.query(
      'SELECT * FROM channel_permissions WHERE channel_id = $1',
      [channelId]
    );

    return result.rows.map(override => ({
      ...override,
      allow: BigInt(override.allow),
      deny: BigInt(override.deny)
    }));
  }

  // Delete override
  static async deleteOverride(channelId: number, roleId?: number, userId?: number): Promise<boolean> {
    let query = 'DELETE FROM channel_permissions WHERE channel_id = $1';
    const params: any[] = [channelId];

    if (roleId) {
      query += ' AND role_id = $2';
      params.push(roleId);
    } else if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return (result.rowCount ?? 0) > 0;
  }
}
