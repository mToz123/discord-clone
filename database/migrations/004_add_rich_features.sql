-- Phase 5C: Rich Features Migration

-- Message embeds table
CREATE TABLE IF NOT EXISTS message_embeds (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'rich', -- rich, link, image, video
    title TEXT,
    description TEXT,
    url TEXT,
    color VARCHAR(7), -- hex color
    thumbnail_url TEXT,
    image_url TEXT,
    footer_text TEXT,
    footer_icon_url TEXT,
    author_name TEXT,
    author_url TEXT,
    author_icon_url TEXT,
    fields JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pinned messages table
CREATE TABLE IF NOT EXISTS pinned_messages (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    pinned_by INTEGER NOT NULL REFERENCES users(id),
    pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id)
);

-- Message mentions table
CREATE TABLE IF NOT EXISTS message_mentions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- Full-text search index for messages
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_message_embeds_message_id ON message_embeds(message_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_channel_id ON pinned_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_user_id ON message_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_message_id ON message_mentions(message_id);
