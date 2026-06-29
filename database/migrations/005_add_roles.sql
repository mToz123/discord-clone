-- Phase 5E: Roles & Permissions Migration

-- Server roles table
CREATE TABLE IF NOT EXISTS server_roles (
    id SERIAL PRIMARY KEY,
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- hex color
    position INTEGER DEFAULT 0, -- higher = more authority
    permissions BIGINT DEFAULT 0, -- bitfield permissions
    mentionable BOOLEAN DEFAULT false,
    hoist BOOLEAN DEFAULT false, -- display separately in member list
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(server_id, name)
);

-- User roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES server_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Channel permission overrides
CREATE TABLE IF NOT EXISTS channel_permissions (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES server_roles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    allow BIGINT DEFAULT 0, -- allowed permissions bitfield
    deny BIGINT DEFAULT 0, -- denied permissions bitfield
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((role_id IS NOT NULL AND user_id IS NULL) OR (role_id IS NULL AND user_id IS NOT NULL)),
    UNIQUE(channel_id, role_id),
    UNIQUE(channel_id, user_id)
);

-- Indexes
CREATE INDEX idx_server_roles_server_id ON server_roles(server_id);
CREATE INDEX idx_server_roles_position ON server_roles(position DESC);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_channel_permissions_channel_id ON channel_permissions(channel_id);
CREATE INDEX idx_channel_permissions_role_id ON channel_permissions(role_id);
CREATE INDEX idx_channel_permissions_user_id ON channel_permissions(user_id);

-- Create default @everyone role for existing servers
-- Note: This should be run after migration
-- INSERT INTO server_roles (server_id, name, position, permissions)
-- SELECT id, '@everyone', 0, 0 FROM servers;
