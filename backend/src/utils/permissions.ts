/**
 * Discord-style Permission System
 * Uses bitfield for efficient permission storage
 */

// Permission flags as const object (not enum, for bigint support)
export const Permission = {
  // General Server Permissions
  VIEW_CHANNELS: 1n << 0n,
  MANAGE_CHANNELS: 1n << 1n,
  MANAGE_ROLES: 1n << 2n,
  MANAGE_SERVER: 1n << 3n,
  CREATE_INVITE: 1n << 4n,
  CHANGE_NICKNAME: 1n << 5n,
  MANAGE_NICKNAMES: 1n << 6n,
  KICK_MEMBERS: 1n << 7n,
  BAN_MEMBERS: 1n << 8n,
  VIEW_AUDIT_LOG: 1n << 9n,

  // Text Channel Permissions
  SEND_MESSAGES: 1n << 10n,
  SEND_MESSAGES_IN_THREADS: 1n << 11n,
  CREATE_THREADS: 1n << 12n,
  EMBED_LINKS: 1n << 13n,
  ATTACH_FILES: 1n << 14n,
  ADD_REACTIONS: 1n << 15n,
  USE_EXTERNAL_EMOJIS: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  MANAGE_MESSAGES: 1n << 18n,
  READ_MESSAGE_HISTORY: 1n << 19n,

  // Voice Channel Permissions
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,

  // Advanced
  ADMINISTRATOR: 1n << 30n,
} as const;

export type PermissionFlag = bigint;

export const ALL_PERMISSIONS = Object.values(Permission).reduce((acc, val) => acc | val, 0n);

export const DEFAULT_PERMISSIONS = 
  Permission.VIEW_CHANNELS |
  Permission.SEND_MESSAGES |
  Permission.SEND_MESSAGES_IN_THREADS |
  Permission.EMBED_LINKS |
  Permission.ATTACH_FILES |
  Permission.ADD_REACTIONS |
  Permission.READ_MESSAGE_HISTORY |
  Permission.CONNECT |
  Permission.SPEAK;

export class PermissionUtil {
  // Check if permissions include a specific permission
  static has(permissions: bigint, permission: bigint): boolean {
    // Administrator has all permissions
    if ((permissions & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR) {
      return true;
    }
    return (permissions & permission) === permission;
  }

  // Check if permissions include any of the specified permissions
  static hasAny(permissions: bigint, ...permissionsToCheck: bigint[]): boolean {
    if ((permissions & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR) {
      return true;
    }
    return permissionsToCheck.some(p => (permissions & p) === p);
  }

  // Check if permissions include all of the specified permissions
  static hasAll(permissions: bigint, ...permissionsToCheck: bigint[]): boolean {
    if ((permissions & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR) {
      return true;
    }
    return permissionsToCheck.every(p => (permissions & p) === p);
  }

  // Add permission
  static add(permissions: bigint, permission: bigint): bigint {
    return permissions | permission;
  }

  // Remove permission
  static remove(permissions: bigint, permission: bigint): bigint {
    return permissions & ~permission;
  }

  // Calculate final permissions with overrides
  static calculate(
    basePermissions: bigint,
    allow: bigint,
    deny: bigint
  ): bigint {
    // Administrator bypasses all overrides
    if ((basePermissions & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR) {
      return basePermissions;
    }

    // Apply deny first, then allow
    let permissions = basePermissions;
    permissions = permissions & ~deny; // Remove denied
    permissions = permissions | allow;  // Add allowed

    return permissions;
  }

  // Convert bigint to array of permission names
  static toArray(permissions: bigint): string[] {
    const result: string[] = [];
    
    for (const [name, value] of Object.entries(Permission)) {
      if ((permissions & value) === value) {
        result.push(name);
      }
    }

    return result;
  }

  // Convert array of permission names to bigint
  static fromArray(permissions: string[]): bigint {
    let result = 0n;

    for (const name of permissions) {
      const value = Permission[name as keyof typeof Permission];
      if (value !== undefined) {
        result = result | value;
      }
    }

    return result;
  }

  // Get permission object for serialization
  static serialize(permissions: bigint): {
    bitfield: string;
    permissions: string[];
  } {
    return {
      bitfield: permissions.toString(),
      permissions: this.toArray(permissions)
    };
  }

  // Parse permission from serialized format
  static deserialize(data: { bitfield: string } | string): bigint {
    if (typeof data === 'string') {
      return BigInt(data);
    }
    return BigInt(data.bitfield);
  }
}

// Permission presets
export const PermissionPresets = {
  ADMIN: Permission.ADMINISTRATOR,
  
  MODERATOR: 
    Permission.VIEW_CHANNELS |
    Permission.MANAGE_CHANNELS |
    Permission.KICK_MEMBERS |
    Permission.BAN_MEMBERS |
    Permission.MANAGE_MESSAGES |
    Permission.MUTE_MEMBERS |
    Permission.MOVE_MEMBERS |
    Permission.VIEW_AUDIT_LOG,
  
  MEMBER: DEFAULT_PERMISSIONS,
  
  EVERYONE: DEFAULT_PERMISSIONS,
  
  READONLY: 
    Permission.VIEW_CHANNELS |
    Permission.READ_MESSAGE_HISTORY,
};

// Permission display names
export const PermissionNames: Record<string, string> = {
  VIEW_CHANNELS: 'View Channels',
  MANAGE_CHANNELS: 'Manage Channels',
  MANAGE_ROLES: 'Manage Roles',
  MANAGE_SERVER: 'Manage Server',
  CREATE_INVITE: 'Create Invite',
  CHANGE_NICKNAME: 'Change Nickname',
  MANAGE_NICKNAMES: 'Manage Nicknames',
  KICK_MEMBERS: 'Kick Members',
  BAN_MEMBERS: 'Ban Members',
  VIEW_AUDIT_LOG: 'View Audit Log',
  SEND_MESSAGES: 'Send Messages',
  SEND_MESSAGES_IN_THREADS: 'Send Messages in Threads',
  CREATE_THREADS: 'Create Threads',
  EMBED_LINKS: 'Embed Links',
  ATTACH_FILES: 'Attach Files',
  ADD_REACTIONS: 'Add Reactions',
  USE_EXTERNAL_EMOJIS: 'Use External Emojis',
  MENTION_EVERYONE: 'Mention @everyone',
  MANAGE_MESSAGES: 'Manage Messages',
  READ_MESSAGE_HISTORY: 'Read Message History',
  CONNECT: 'Connect to Voice',
  SPEAK: 'Speak in Voice',
  MUTE_MEMBERS: 'Mute Members',
  DEAFEN_MEMBERS: 'Deafen Members',
  MOVE_MEMBERS: 'Move Members',
  ADMINISTRATOR: 'Administrator',
};
