'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface Role {
  id: number;
  name: string;
  color?: string;
  position: number;
  permissions: {
    bitfield: string;
    permissions: string[];
  };
  mentionable: boolean;
  hoist: boolean;
}

interface RoleManagerProps {
  serverId: string;
  onClose: () => void;
}

const PERMISSION_CATEGORIES = {
  'General': [
    'VIEW_CHANNELS',
    'MANAGE_CHANNELS',
    'MANAGE_ROLES',
    'MANAGE_SERVER',
    'CREATE_INVITE',
  ],
  'Membership': [
    'CHANGE_NICKNAME',
    'MANAGE_NICKNAMES',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
  ],
  'Text Permissions': [
    'SEND_MESSAGES',
    'EMBED_LINKS',
    'ATTACH_FILES',
    'ADD_REACTIONS',
    'MENTION_EVERYONE',
    'MANAGE_MESSAGES',
    'READ_MESSAGE_HISTORY',
  ],
  'Voice Permissions': [
    'CONNECT',
    'SPEAK',
    'MUTE_MEMBERS',
    'MOVE_MEMBERS',
  ],
};

const PERMISSION_NAMES: Record<string, string> = {
  VIEW_CHANNELS: 'View Channels',
  MANAGE_CHANNELS: 'Manage Channels',
  MANAGE_ROLES: 'Manage Roles',
  MANAGE_SERVER: 'Manage Server',
  CREATE_INVITE: 'Create Invite',
  CHANGE_NICKNAME: 'Change Nickname',
  MANAGE_NICKNAMES: 'Manage Nicknames',
  KICK_MEMBERS: 'Kick Members',
  BAN_MEMBERS: 'Ban Members',
  SEND_MESSAGES: 'Send Messages',
  EMBED_LINKS: 'Embed Links',
  ATTACH_FILES: 'Attach Files',
  ADD_REACTIONS: 'Add Reactions',
  MENTION_EVERYONE: 'Mention @everyone',
  MANAGE_MESSAGES: 'Manage Messages',
  READ_MESSAGE_HISTORY: 'Read Message History',
  CONNECT: 'Connect to Voice',
  SPEAK: 'Speak in Voice',
  MUTE_MEMBERS: 'Mute Members',
  MOVE_MEMBERS: 'Move Members',
  ADMINISTRATOR: 'Administrator (All Permissions)',
};

const ROLE_COLORS = [
  '#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245',
  '#E67E22', '#1ABC9C', '#3498DB', '#9B59B6', '#95A5A6'
];

export default function RoleManager({ serverId, onClose }: RoleManagerProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    color: '#5865F2',
    permissions: [] as string[],
    mentionable: false,
    hoist: false,
  });

  useEffect(() => {
    fetchRoles();
  }, [serverId]);

  useEffect(() => {
    if (selectedRole) {
      setFormData({
        name: selectedRole.name,
        color: selectedRole.color || '#5865F2',
        permissions: selectedRole.permissions.permissions,
        mentionable: selectedRole.mentionable,
        hoist: selectedRole.hoist,
      });
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const response = await api.get(`/servers/${serverId}/roles`);
      setRoles(response.data.roles || []);
      if (response.data.roles?.length > 0) {
        setSelectedRole(response.data.roles[0]);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post(`/servers/${serverId}/roles`, formData);
      await fetchRoles();
      setCreating(false);
      setFormData({
        name: '',
        color: '#5865F2',
        permissions: [],
        mentionable: false,
        hoist: false,
      });
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;
    try {
      await api.patch(`/roles/${selectedRole.id}`, formData);
      await fetchRoles();
      setEditing(false);
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole || selectedRole.name === '@everyone') return;
    if (!confirm(`Delete role "${selectedRole.name}"?`)) return;

    try {
      await api.delete(`/roles/${selectedRole.id}`);
      await fetchRoles();
      setSelectedRole(null);
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  const togglePermission = (permission: string) => {
    if (formData.permissions.includes(permission)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permission)
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission]
      });
    }
  };

  const isAdmin = formData.permissions.includes('ADMINISTRATOR');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield size={24} className="text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Server Roles</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Roles List */}
          <div className="w-64 border-r border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700">
              <button
                onClick={() => {
                  setCreating(true);
                  setEditing(false);
                  setSelectedRole(null);
                  setFormData({
                    name: 'New Role',
                    color: '#5865F2',
                    permissions: [],
                    mentionable: false,
                    hoist: false,
                  });
                }}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <Plus size={16} />
                <span>Create Role</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading && (
                <div className="text-center text-gray-400 py-4">Loading...</div>
              )}

              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    setSelectedRole(role);
                    setEditing(false);
                    setCreating(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 ${
                    selectedRole?.id === role.id
                      ? 'bg-gray-700'
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role.color || '#5865F2' }}
                  />
                  <span className="text-white flex-1 truncate">{role.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Role Editor */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedRole && !creating && (
              <div className="text-center text-gray-400 py-12">
                <Shield size={64} className="mx-auto mb-4 opacity-50" />
                <p>Select a role to edit or create a new one</p>
              </div>
            )}

            {(selectedRole || creating) && (
              <div className="space-y-6">
                {/* Role Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={selectedRole?.name === '@everyone' || (!editing && !creating)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Role Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role Color
                  </label>
                  <div className="flex items-center space-x-2">
                    {ROLE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => (editing || creating) && setFormData({ ...formData, color })}
                        disabled={!editing && !creating}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-white' : 'border-transparent'
                        } disabled:opacity-50`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Role Settings */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hoist}
                      onChange={(e) => setFormData({ ...formData, hoist: e.target.checked })}
                      disabled={!editing && !creating}
                      className="form-checkbox rounded bg-gray-700 border-gray-600 text-blue-600"
                    />
                    <span className="text-gray-300">Display role members separately</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mentionable}
                      onChange={(e) => setFormData({ ...formData, mentionable: e.target.checked })}
                      disabled={!editing && !creating}
                      className="form-checkbox rounded bg-gray-700 border-gray-600 text-blue-600"
                    />
                    <span className="text-gray-300">Allow anyone to mention this role</span>
                  </label>
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Permissions</h3>

                  {isAdmin && (
                    <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
                      <p className="text-yellow-400 text-sm">
                        Administrator role has all permissions automatically
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">{category}</h4>
                        <div className="space-y-1">
                          {perms.map((perm) => (
                            <label
                              key={perm}
                              className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-700/50"
                            >
                              <input
                                type="checkbox"
                                checked={isAdmin || formData.permissions.includes(perm)}
                                onChange={() => togglePermission(perm)}
                                disabled={isAdmin || (!editing && !creating)}
                                className="form-checkbox rounded bg-gray-700 border-gray-600 text-blue-600"
                              />
                              <span className="text-gray-300 text-sm">
                                {PERMISSION_NAMES[perm] || perm}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Administrator */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Advanced</h4>
                      <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-700/50">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('ADMINISTRATOR')}
                          onChange={() => togglePermission('ADMINISTRATOR')}
                          disabled={!editing && !creating}
                          className="form-checkbox rounded bg-gray-700 border-gray-600 text-red-600"
                        />
                        <span className="text-red-400 text-sm font-semibold">
                          {PERMISSION_NAMES.ADMINISTRATOR}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  {creating ? (
                    <>
                      <button
                        onClick={() => setCreating(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-2"
                      >
                        <Check size={16} />
                        <span>Create Role</span>
                      </button>
                    </>
                  ) : editing ? (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdate}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-2"
                      >
                        <Check size={16} />
                        <span>Save Changes</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {selectedRole?.name !== '@everyone' && (
                        <button
                          onClick={handleDelete}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center space-x-2"
                        >
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Edit2 size={16} />
                        <span>Edit Role</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
