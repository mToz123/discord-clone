import { Request, Response } from 'express';
import { z } from 'zod';
import { RoleModel, ChannelPermissionModel } from '../models/Role';
import { ServerModel } from '../models/Server';
import { ChannelModel } from '../models/Channel';
import { Permission, PermissionUtil, PermissionPresets } from '../utils/permissions';

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  permissions: z.array(z.string()).optional(),
  mentionable: z.boolean().optional(),
  hoist: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  position: z.number().int().min(0).optional(),
  permissions: z.array(z.string()).optional(),
  mentionable: z.boolean().optional(),
  hoist: z.boolean().optional(),
});

const setOverrideSchema = z.object({
  allow: z.array(z.string()),
  deny: z.array(z.string()),
});

export class RoleController {
  // Create role
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const serverId = parseInt(req.params.serverId);
      const userId = req.user!.id;

      if (isNaN(serverId)) {
        res.status(400).json({ error: 'Invalid server ID' });
        return;
      }

      // Check if user has permission to manage roles
      const userPermissions = await RoleModel.calculateUserPermissions(userId, serverId);
      if (!PermissionUtil.has(userPermissions, Permission.MANAGE_ROLES)) {
        res.status(403).json({ error: 'Missing permission: MANAGE_ROLES' });
        return;
      }

      const data = createRoleSchema.parse(req.body);

      // Convert permission names to bigint
      const permissions = data.permissions 
        ? PermissionUtil.fromArray(data.permissions)
        : PermissionPresets.MEMBER;

      const role = await RoleModel.create(serverId, data.name, {
        color: data.color,
        permissions,
        mentionable: data.mentionable,
        hoist: data.hoist,
      });

      // Serialize permissions for response
      const serialized = {
        ...role,
        permissions: PermissionUtil.serialize(role.permissions)
      };

      res.status(201).json({ role: serialized });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Create role error:', error);
      res.status(500).json({ error: 'Failed to create role' });
    }
  }

  // Get server roles
  static async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const serverId = parseInt(req.params.serverId);

      if (isNaN(serverId)) {
        res.status(400).json({ error: 'Invalid server ID' });
        return;
      }

      const roles = await RoleModel.getByServerId(serverId);

      // Serialize permissions
      const serialized = roles.map(role => ({
        ...role,
        permissions: PermissionUtil.serialize(role.permissions)
      }));

      res.json({ roles: serialized });
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  }

  // Update role
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const roleId = parseInt(req.params.roleId);
      const userId = req.user!.id;

      if (isNaN(roleId)) {
        res.status(400).json({ error: 'Invalid role ID' });
        return;
      }

      const role = await RoleModel.findById(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Check permission
      const userPermissions = await RoleModel.calculateUserPermissions(userId, role.server_id);
      if (!PermissionUtil.has(userPermissions, Permission.MANAGE_ROLES)) {
        res.status(403).json({ error: 'Missing permission: MANAGE_ROLES' });
        return;
      }

      // Cannot edit @everyone name
      if (role.name === '@everyone' && req.body.name && req.body.name !== '@everyone') {
        res.status(400).json({ error: 'Cannot rename @everyone role' });
        return;
      }

      const data = updateRoleSchema.parse(req.body);

      const updates: any = {};
      if (data.name) updates.name = data.name;
      if (data.color !== undefined) updates.color = data.color;
      if (data.position !== undefined) updates.position = data.position;
      if (data.mentionable !== undefined) updates.mentionable = data.mentionable;
      if (data.hoist !== undefined) updates.hoist = data.hoist;
      if (data.permissions) {
        updates.permissions = PermissionUtil.fromArray(data.permissions);
      }

      const updated = await RoleModel.update(roleId, updates);

      if (!updated) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Serialize permissions
      const serialized = {
        ...updated,
        permissions: PermissionUtil.serialize(updated.permissions)
      };

      res.json({ role: serialized });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Update role error:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  }

  // Delete role
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const roleId = parseInt(req.params.roleId);
      const userId = req.user!.id;

      if (isNaN(roleId)) {
        res.status(400).json({ error: 'Invalid role ID' });
        return;
      }

      const role = await RoleModel.findById(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Cannot delete @everyone
      if (role.name === '@everyone') {
        res.status(400).json({ error: 'Cannot delete @everyone role' });
        return;
      }

      // Check permission
      const userPermissions = await RoleModel.calculateUserPermissions(userId, role.server_id);
      if (!PermissionUtil.has(userPermissions, Permission.MANAGE_ROLES)) {
        res.status(403).json({ error: 'Missing permission: MANAGE_ROLES' });
        return;
      }

      await RoleModel.delete(roleId);

      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  }

  // Assign role to member
  static async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const serverId = parseInt(req.params.serverId);
      const memberId = parseInt(req.params.memberId);
      const roleId = parseInt(req.params.roleId);
      const userId = req.user!.id;

      if (isNaN(serverId) || isNaN(memberId) || isNaN(roleId)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      // Check permission
      const userPermissions = await RoleModel.calculateUserPermissions(userId, serverId);
      if (!PermissionUtil.has(userPermissions, Permission.MANAGE_ROLES)) {
        res.status(403).json({ error: 'Missing permission: MANAGE_ROLES' });
        return;
      }

      // Verify role belongs to server
      const role = await RoleModel.findById(roleId);
      if (!role || role.server_id !== serverId) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Cannot assign @everyone
      if (role.name === '@everyone') {
        res.status(400).json({ error: 'Cannot assign @everyone role' });
        return;
      }

      await RoleModel.assignToUser(memberId, roleId);

      res.json({ message: 'Role assigned successfully' });
    } catch (error) {
      console.error('Assign role error:', error);
      res.status(500).json({ error: 'Failed to assign role' });
    }
  }

  // Remove role from member
  static async removeRole(req: Request, res: Response): Promise<void> {
    try {
      const serverId = parseInt(req.params.serverId);
      const memberId = parseInt(req.params.memberId);
      const roleId = parseInt(req.params.roleId);
      const userId = req.user!.id;

      if (isNaN(serverId) || isNaN(memberId) || isNaN(roleId)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      // Check permission
      const userPermissions = await RoleModel.calculateUserPermissions(userId, serverId);
      if (!PermissionUtil.has(userPermissions, Permission.MANAGE_ROLES)) {
        res.status(403).json({ error: 'Missing permission: MANAGE_ROLES' });
        return;
      }

      // Verify role belongs to server
      const role = await RoleModel.findById(roleId);
      if (!role || role.server_id !== serverId) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      await RoleModel.removeFromUser(memberId, roleId);

      res.json({ message: 'Role removed successfully' });
    } catch (error) {
      console.error('Remove role error:', error);
      res.status(500).json({ error: 'Failed to remove role' });
    }
  }

  // Get member roles
  static async getMemberRoles(req: Request, res: Response): Promise<void> {
    try {
      const serverId = parseInt(req.params.serverId);
      const memberId = parseInt(req.params.memberId);

      if (isNaN(serverId) || isNaN(memberId)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      const roles = await RoleModel.getUserRoles(memberId, serverId);

      // Serialize permissions
      const serialized = roles.map(role => ({
        ...role,
        permissions: PermissionUtil.serialize(role.permissions)
      }));

      res.json({ roles: serialized });
    } catch (error) {
      console.error('Get member roles error:', error);
      res.status(500).json({ error: 'Failed to fetch member roles' });
    }
  }

  // Set channel permission override
  static async setChannelOverride(req: Request, res: Response): Promise<void> {
    try {
      const channelId = parseInt(req.params.channelId);
      const userId = req.user!.id;

      if (isNaN(channelId)) {
        res.status(400).json({ error: 'Invalid channel ID' });
        return;
      }

      const channel = await ChannelModel.findById(channelId.toString());
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }

      const serverId = parseInt(channel.server_id);

      // Check permission
      const userPermissions = await RoleModel.calculateUserPermissions(userId, serverId);
      if (!PermissionUtil.has(userPermissions, Permission.MANAGE_CHANNELS)) {
        res.status(403).json({ error: 'Missing permission: MANAGE_CHANNELS' });
        return;
      }

      const data = setOverrideSchema.parse(req.body);
      const { roleId, memberId } = req.body;

      if (roleId && memberId) {
        res.status(400).json({ error: 'Cannot set both roleId and memberId' });
        return;
      }

      if (!roleId && !memberId) {
        res.status(400).json({ error: 'Must provide either roleId or memberId' });
        return;
      }

      const allow = PermissionUtil.fromArray(data.allow);
      const deny = PermissionUtil.fromArray(data.deny);

      let override;
      if (roleId) {
        override = await ChannelPermissionModel.setRoleOverride(channelId, parseInt(roleId), allow, deny);
      } else {
        override = await ChannelPermissionModel.setUserOverride(channelId, parseInt(memberId), allow, deny);
      }

      // Serialize
      const serialized = {
        ...override,
        allow: PermissionUtil.serialize(override.allow),
        deny: PermissionUtil.serialize(override.deny)
      };

      res.json({ override: serialized });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Set channel override error:', error);
      res.status(500).json({ error: 'Failed to set channel override' });
    }
  }

  // Get channel overrides
  static async getChannelOverrides(req: Request, res: Response): Promise<void> {
    try {
      const channelId = parseInt(req.params.channelId);

      if (isNaN(channelId)) {
        res.status(400).json({ error: 'Invalid channel ID' });
        return;
      }

      const overrides = await ChannelPermissionModel.getByChannelId(channelId);

      // Serialize
      const serialized = overrides.map(override => ({
        ...override,
        allow: PermissionUtil.serialize(override.allow),
        deny: PermissionUtil.serialize(override.deny)
      }));

      res.json({ overrides: serialized });
    } catch (error) {
      console.error('Get channel overrides error:', error);
      res.status(500).json({ error: 'Failed to fetch channel overrides' });
    }
  }

  // Delete channel override
  static async deleteChannelOverride(req: Request, res: Response): Promise<void> {
    try {
      const channelId = parseInt(req.params.channelId);
      const userId = req.user!.id;
      const { roleId, memberId } = req.query;

      if (isNaN(channelId)) {
        res.status(400).json({ error: 'Invalid channel ID' });
        return;
      }

      const channel = await ChannelModel.findById(channelId.toString());
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }

      const serverId = parseInt(channel.server_id);

      // Check permission
      const userPermissions = await RoleModel.calculateUserPermissions(userId, serverId);
      if (!PermissionUtil.has(userPermissions, Permission.MANAGE_CHANNELS)) {
        res.status(403).json({ error: 'Missing permission: MANAGE_CHANNELS' });
        return;
      }

      await ChannelPermissionModel.deleteOverride(
        channelId,
        roleId ? parseInt(roleId as string) : undefined,
        memberId ? parseInt(memberId as string) : undefined
      );

      res.json({ message: 'Override deleted successfully' });
    } catch (error) {
      console.error('Delete channel override error:', error);
      res.status(500).json({ error: 'Failed to delete channel override' });
    }
  }
}
