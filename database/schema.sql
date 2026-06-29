-- Discord Clone Database Schema - Phase 1
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================
-- USERS TABLE
-- ==================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'idle', 'dnd', 'offline')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- ==================
-- SERVERS TABLE
-- ==================
CREATE TABLE servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  icon_url TEXT,
  banner_url TEXT,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vanity_url VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_servers_owner ON servers(owner_id);
CREATE INDEX idx_servers_vanity ON servers(vanity_url) WHERE vanity_url IS NOT NULL;

-- ==================
-- CHANNELS TABLE
-- ==================
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'voice', 'category', 'announcement')),
  topic TEXT,
  position INT DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  slowmode_seconds INT DEFAULT 0 CHECK (slowmode_seconds >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_channels_server ON channels(server_id);
CREATE INDEX idx_channels_parent ON channels(parent_id) WHERE parent_id IS NOT NULL;

-- ==================
-- MESSAGES TABLE
-- ==================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT,
  attachments JSONB DEFAULT '[]',
  embeds JSONB DEFAULT '[]',
  mentions JSONB DEFAULT '[]',
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);

-- ==================
-- SERVER MEMBERS TABLE
-- ==================
CREATE TABLE server_members (
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(32),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (server_id, user_id)
);

CREATE INDEX idx_server_members_user ON server_members(user_id);

-- ==================
-- ROLES TABLE
-- ==================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- hex color like #FF5733
  position INT DEFAULT 0,
  permissions BIGINT DEFAULT 0,
  mentionable BOOLEAN DEFAULT false,
  hoisted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_roles_server ON roles(server_id);

-- ==================
-- MEMBER ROLES TABLE (Many-to-Many)
-- ==================
CREATE TABLE member_roles (
  server_id UUID,
  user_id UUID,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (server_id, user_id, role_id),
  FOREIGN KEY (server_id, user_id) REFERENCES server_members(server_id, user_id) ON DELETE CASCADE
);

-- ==================
-- UPDATED_AT TRIGGER
-- ==================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================
-- SEED DATA (Development Only)
-- ==================

-- Insert test user
INSERT INTO users (username, email, password_hash, status) VALUES
('testuser', 'test@example.com', '$2b$10$rKvVJZnJfK0F3c6zKZqKiOnGKJZQYZ5kKqU5kKqU5kKqU5kKqU5kKq', 'online'),
('admin', 'admin@example.com', '$2b$10$rKvVJZnJfK0F3c6zKZqKiOnGKJZQYZ5kKqU5kKqU5kKqU5kKqU5kKq', 'online');

-- Note: password for both users is "password123" (bcrypt hashed)
