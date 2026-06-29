# Bot API - Quick Start Guide

## 🤖 Creating Your First Bot

### 1. Create a Bot Account

```bash
POST /api/bots
Authorization: Bearer <your_user_token>
Content-Type: application/json

{
  "name": "My First Bot",
  "prefix": "!",
  "description": "A simple bot",
  "permissions": ["read_messages", "send_messages", "add_reactions"]
}
```

**Response:**
```json
{
  "bot": {
    "id": 1,
    "name": "My First Bot",
    "token": "bot_abc123...",
    "prefix": "!",
    "permissions": ["read_messages", "send_messages"]
  },
  "message": "Bot created successfully. Keep your token safe!"
}
```

⚠️ **IMPORTANT:** Save your bot token securely! You cannot retrieve it later.

---

### 2. Add Bot to Server

```bash
POST /api/bots/1/servers/123
Authorization: Bearer <your_user_token>
```

---

### 3. Use Bot API

All bot API requests use the bot token:

```bash
Authorization: Bot <bot_token>
```

---

## 📡 Bot API Endpoints

### Get Bot Info
```
GET /api/bot/me
```

### Send Message
```
POST /api/bot/channels/:channelId/messages
{
  "content": "Hello from bot!",
  "attachments": []
}
```

### Edit Message
```
PUT /api/bot/messages/:messageId
{
  "content": "Updated message"
}
```

### Delete Message
```
DELETE /api/bot/messages/:messageId
```

### Add Reaction
```
POST /api/bot/messages/:messageId/reactions/:emoji
```

### Get Channel Messages
```
GET /api/bot/channels/:channelId/messages?limit=50&before=123
```

### Get Server Info
```
GET /api/bot/servers/:serverId
```

### Get Server Channels
```
GET /api/bot/servers/:serverId/channels
```

### Get Server Members
```
GET /api/bot/servers/:serverId/members
```

---

## 🎯 Commands System

### Register Commands

```bash
POST /api/bots/1/commands
Authorization: Bearer <your_user_token>

{
  "name": "ping",
  "description": "Check bot latency",
  "usage": "!ping",
  "cooldown": 5
}
```

### Get Bot Commands

```bash
GET /api/bots/1/commands
```

---

## 📬 Webhook Events

### Subscribe to Events

```bash
POST /api/bots/1/events
Authorization: Bearer <your_user_token>

{
  "event_type": "message.create",
  "webhook_url": "https://your-server.com/webhook",
  "secret": "your_webhook_secret"
}
```

### Available Events

- `message.create` - New message created
- `message.update` - Message edited
- `message.delete` - Message deleted
- `member.join` - Member joined server
- `member.leave` - Member left server
- `reaction.add` - Reaction added to message
- `reaction.remove` - Reaction removed from message
- `channel.create` - Channel created
- `channel.update` - Channel updated
- `channel.delete` - Channel deleted

### Webhook Payload Format

```json
{
  "event_type": "message.create",
  "timestamp": "2024-06-29T11:29:00Z",
  "data": {
    "id": 123,
    "channel_id": 456,
    "user_id": 789,
    "content": "Hello!",
    "created_at": "2024-06-29T11:29:00Z"
  }
}
```

### Webhook Signature Verification

Webhooks include `X-Webhook-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

---

## 🛠️ Bot SDK (JavaScript/TypeScript)

### Installation

```bash
# Copy bot-sdk.ts to your project
# Install dependencies
npm install axios
```

### Basic Usage

```typescript
import { DiscordCloneBot, createWebhookServer } from './bot-sdk';

const bot = new DiscordCloneBot({
  token: 'bot_your_token_here',
  baseUrl: 'http://localhost:3001/api/bot'
});

// Register commands
bot.registerCommand('ping', async (message, args) => {
  await bot.sendMessage(message.channel_id, 'Pong! 🏓');
});

bot.registerCommand('hello', async (message, args) => {
  const name = args[0] || 'World';
  await bot.sendMessage(message.channel_id, `Hello ${name}!`);
});

bot.registerCommand('help', async (message, args) => {
  const help = `
**Available Commands:**
!ping - Check bot latency
!hello [name] - Say hello
!help - Show this message
  `;
  await bot.sendMessage(message.channel_id, help);
});

// Listen to events
bot.on('message.create', async (data) => {
  // Handle commands
  await bot.handleCommand(data, '!');
});

bot.on('member.join', async (data) => {
  console.log(`New member joined: ${data.user_id}`);
  // Send welcome message
});

// Start webhook server
createWebhookServer(bot, 3002, 'your_webhook_secret');

console.log('Bot is running!');
```

---

## 🎮 Example Bots

### 1. Welcome Bot

```typescript
bot.on('member.join', async (data) => {
  const channels = await bot.getChannels(data.server_id);
  const generalChannel = channels.find(c => c.name === 'general');
  
  if (generalChannel) {
    await bot.sendMessage(
      generalChannel.id,
      `Welcome to the server, <@${data.user_id}>! 👋`
    );
  }
});
```

### 2. Auto-Moderator Bot

```typescript
bot.on('message.create', async (data) => {
  const bannedWords = ['spam', 'badword'];
  const content = data.content.toLowerCase();
  
  for (const word of bannedWords) {
    if (content.includes(word)) {
      await bot.deleteMessage(data.id);
      await bot.sendMessage(
        data.channel_id,
        `⚠️ Message deleted: Contains prohibited word`
      );
      break;
    }
  }
});
```

### 3. Echo Bot

```typescript
bot.registerCommand('echo', async (message, args) => {
  const text = args.join(' ');
  if (text) {
    await bot.sendMessage(message.channel_id, text);
  }
});
```

### 4. Poll Bot

```typescript
bot.registerCommand('poll', async (message, args) => {
  const question = args.join(' ');
  
  if (!question) {
    await bot.sendMessage(message.channel_id, 'Usage: !poll <question>');
    return;
  }
  
  const pollMessage = await bot.sendMessage(
    message.channel_id,
    `📊 **Poll:** ${question}`
  );
  
  // Add reaction options
  await bot.addReaction(pollMessage.id, '👍');
  await bot.addReaction(pollMessage.id, '👎');
});
```

---

## 🔒 Permissions

Available permissions:
- `read_messages` - Read channel messages
- `send_messages` - Send messages
- `manage_messages` - Delete any message
- `manage_channels` - Create/edit/delete channels
- `manage_server` - Manage server settings
- `ban_members` - Ban members
- `kick_members` - Kick members
- `add_reactions` - Add reactions to messages

---

## 🚀 Deployment

### 1. Create bot on production

```bash
curl -X POST https://your-discord-clone.com/api/bots \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Bot",
    "prefix": "!",
    "permissions": ["read_messages", "send_messages"]
  }'
```

### 2. Deploy bot code

```bash
# Example: Deploy to Railway, Heroku, or VPS
git push production main
```

### 3. Configure webhooks

Point webhook URLs to your deployed bot server.

---

## 📊 Rate Limits

- Message sending: 5 messages per 5 seconds per channel
- API requests: 50 requests per 10 seconds per bot
- Webhooks: 100 deliveries per minute per bot

---

## 💡 Best Practices

1. **Store tokens securely** - Use environment variables
2. **Verify webhook signatures** - Prevent unauthorized requests
3. **Handle errors gracefully** - Bot should recover from failures
4. **Rate limit your commands** - Use cooldowns
5. **Log important events** - Monitor bot activity
6. **Test before production** - Use test servers

---

## 🆘 Troubleshooting

### Bot not responding to commands
- Check bot is added to the server
- Verify bot has required permissions
- Check webhook is configured correctly

### Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check webhook signature verification
- Ensure event type is subscribed

### Rate limit errors
- Implement exponential backoff
- Cache responses when possible
- Reduce message frequency

---

## 📚 Full API Reference

See `BOT-API-REFERENCE.md` for complete API documentation.
