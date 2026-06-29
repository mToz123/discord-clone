/**
 * Example Bot - Simple Discord Clone Bot
 * 
 * This bot demonstrates:
 * - Command handling (!ping, !hello, !help)
 * - Event listening (message.create, member.join)
 * - Webhook server setup
 */

import axios from 'axios';
import express from 'express';
import crypto from 'crypto';

// Bot configuration
const BOT_TOKEN = process.env.BOT_TOKEN || 'bot_your_token_here';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/bot';
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3002');
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Bot client
const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Helper functions
async function sendMessage(channelId: number, content: string) {
  try {
    const response = await client.post(`/channels/${channelId}/messages`, { content });
    return response.data.message;
  } catch (error: any) {
    console.error('Send message error:', error.response?.data || error.message);
  }
}

async function addReaction(messageId: number, emoji: string) {
  try {
    await client.post(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  } catch (error: any) {
    console.error('Add reaction error:', error.response?.data || error.message);
  }
}

// Command handlers
const commands: Record<string, (message: any, args: string[]) => Promise<void>> = {
  ping: async (message, args) => {
    const start = Date.now();
    const reply = await sendMessage(message.channel_id, '🏓 Pong!');
    const latency = Date.now() - start;
    
    if (reply) {
      await client.put(`/messages/${reply.id}`, {
        content: `🏓 Pong! Latency: ${latency}ms`
      });
    }
  },

  hello: async (message, args) => {
    const name = args[0] || 'World';
    await sendMessage(message.channel_id, `👋 Hello ${name}!`);
  },

  help: async (message, args) => {
    const helpText = `
**🤖 Bot Commands:**

\`!ping\` - Check bot latency
\`!hello [name]\` - Say hello
\`!echo <text>\` - Echo your message
\`!roll [max]\` - Roll a dice (default: 6)
\`!flip\` - Flip a coin
\`!poll <question>\` - Create a poll
\`!help\` - Show this message
    `.trim();
    
    await sendMessage(message.channel_id, helpText);
  },

  echo: async (message, args) => {
    if (args.length === 0) {
      await sendMessage(message.channel_id, '❌ Usage: !echo <text>');
      return;
    }
    
    const text = args.join(' ');
    await sendMessage(message.channel_id, text);
  },

  roll: async (message, args) => {
    const max = parseInt(args[0]) || 6;
    
    if (max < 1 || max > 1000) {
      await sendMessage(message.channel_id, '❌ Number must be between 1 and 1000');
      return;
    }
    
    const result = Math.floor(Math.random() * max) + 1;
    await sendMessage(message.channel_id, `🎲 You rolled: **${result}** (1-${max})`);
  },

  flip: async (message, args) => {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    await sendMessage(message.channel_id, `🪙 Coin flip: **${result}**`);
  },

  poll: async (message, args) => {
    if (args.length === 0) {
      await sendMessage(message.channel_id, '❌ Usage: !poll <question>');
      return;
    }
    
    const question = args.join(' ');
    const pollMessage = await sendMessage(message.channel_id, `📊 **Poll:** ${question}`);
    
    if (pollMessage) {
      await addReaction(pollMessage.id, '👍');
      await addReaction(pollMessage.id, '👎');
      await addReaction(pollMessage.id, '🤷');
    }
  }
};

// Command handler
async function handleCommand(message: any, prefix: string = '!') {
  const content = message.content.trim();
  
  if (!content.startsWith(prefix)) {
    return;
  }

  const args = content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) {
    return;
  }

  const handler = commands[commandName];
  
  if (handler) {
    try {
      console.log(`Executing command: ${commandName}`);
      await handler(message, args);
    } catch (error) {
      console.error(`Command error [${commandName}]:`, error);
      await sendMessage(message.channel_id, `❌ Error executing command: ${commandName}`);
    }
  }
}

// Event handlers
const eventHandlers: Record<string, (data: any) => Promise<void>> = {
  'message.create': async (data) => {
    // Ignore bot's own messages
    if (data.user?.is_bot) {
      return;
    }
    
    console.log(`Message from ${data.user?.username}: ${data.content}`);
    await handleCommand(data, '!');
  },

  'member.join': async (data) => {
    console.log(`New member joined: ${data.user_id} in server ${data.server_id}`);
    
    try {
      // Get server channels
      const response = await client.get(`/servers/${data.server_id}/channels`);
      const channels = response.data.channels;
      const generalChannel = channels.find((c: any) => c.name === 'general');
      
      if (generalChannel) {
        await sendMessage(
          generalChannel.id,
          `👋 Welcome to the server! Enjoy your stay!`
        );
      }
    } catch (error: any) {
      console.error('Welcome message error:', error.response?.data || error.message);
    }
  },

  'member.leave': async (data) => {
    console.log(`Member left: ${data.user_id} from server ${data.server_id}`);
  },

  'reaction.add': async (data) => {
    console.log(`Reaction added: ${data.emoji} on message ${data.message_id}`);
  }
};

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    return true; // Skip verification if no secret configured
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

// Webhook server
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  if (!verifySignature(payload, signature, WEBHOOK_SECRET)) {
    console.error('Invalid webhook signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }
  
  const event = req.body;
  console.log(`Received event: ${event.event_type}`);
  
  // Handle event
  const handler = eventHandlers[event.event_type];
  if (handler) {
    try {
      await handler(event.data);
    } catch (error) {
      console.error(`Event handler error [${event.event_type}]:`, error);
    }
  }
  
  res.json({ received: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start bot
async function start() {
  try {
    // Get bot info
    const response = await client.get('/me');
    const botInfo = response.data;
    
    console.log(`
╔════════════════════════════════════════╗
║   🤖 Bot Started                       ║
║   Name: ${botInfo.name.padEnd(30)} ║
║   Prefix: ${botInfo.prefix.padEnd(28)} ║
║   Webhook: http://localhost:${WEBHOOK_PORT.toString().padEnd(15)} ║
╚════════════════════════════════════════╝
    `);
    
    // Start webhook server
    app.listen(WEBHOOK_PORT, () => {
      console.log(`✅ Webhook server listening on port ${WEBHOOK_PORT}`);
      console.log(`📡 POST http://localhost:${WEBHOOK_PORT}/webhook`);
      console.log(`\n⚠️  Make sure to configure this URL in bot settings!`);
    });
  } catch (error: any) {
    console.error('Failed to start bot:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Bot shutting down...');
  process.exit(0);
});

// Start
start();
