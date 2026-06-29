-- Phase 5A: Bot API System Database Schema

-- Bots table
CREATE TABLE IF NOT EXISTS bots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    avatar TEXT,
    prefix VARCHAR(10) DEFAULT '!',
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bot commands table
CREATE TABLE IF NOT EXISTS bot_commands (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    usage TEXT,
    cooldown INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bot_id, name)
);

-- Bot events table (webhook subscriptions)
CREATE TABLE IF NOT EXISTS bot_events (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    webhook_url TEXT NOT NULL,
    secret VARCHAR(255),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bot_id, event_type)
);

-- Bot permissions enum
-- Possible values: 'read_messages', 'send_messages', 'manage_messages', 
--                  'manage_channels', 'manage_server', 'ban_members', 
--                  'kick_members', 'add_reactions'

-- Indexes for performance
CREATE INDEX idx_bots_user_id ON bots(user_id);
CREATE INDEX idx_bots_token ON bots(token);
CREATE INDEX idx_bot_commands_bot_id ON bot_commands(bot_id);
CREATE INDEX idx_bot_events_bot_id ON bot_events(bot_id);
CREATE INDEX idx_bot_events_event_type ON bot_events(event_type);

-- Server bots (which bots are added to which servers)
CREATE TABLE IF NOT EXISTS server_bots (
    id SERIAL PRIMARY KEY,
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    added_by INTEGER NOT NULL REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(server_id, bot_id)
);

CREATE INDEX idx_server_bots_server_id ON server_bots(server_id);
CREATE INDEX idx_server_bots_bot_id ON server_bots(bot_id);
