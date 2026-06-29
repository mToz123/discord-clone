/**
 * Discord Clone Bot SDK
 * Simple JavaScript/TypeScript library for creating bots
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export interface BotConfig {
  token: string;
  baseUrl?: string;
}

export interface Message {
  id: number;
  channel_id: number;
  user_id: number;
  content: string;
  attachments?: any[];
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  event_type: string;
  timestamp: string;
  data: any;
}

export class DiscordCloneBot {
  private client: AxiosInstance;
  private token: string;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(config: BotConfig) {
    this.token = config.token;
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'http://localhost:3001/api/bot',
      headers: {
        'Authorization': `Bot ${config.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  // Get bot info
  async getMe() {
    const response = await this.client.get('/me');
    return response.data;
  }

  // Send message to channel
  async sendMessage(channelId: number, content: string, attachments?: any[]) {
    const response = await this.client.post(`/channels/${channelId}/messages`, {
      content,
      attachments
    });
    return response.data.message;
  }

  // Edit message
  async editMessage(messageId: number, content: string) {
    const response = await this.client.put(`/messages/${messageId}`, {
      content
    });
    return response.data.message;
  }

  // Delete message
  async deleteMessage(messageId: number) {
    await this.client.delete(`/messages/${messageId}`);
  }

  // Add reaction
  async addReaction(messageId: number, emoji: string) {
    await this.client.post(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  }

  // Remove reaction
  async removeReaction(messageId: number, emoji: string) {
    await this.client.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  }

  // Get channel messages
  async getMessages(channelId: number, options?: { limit?: number; before?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.before) params.append('before', options.before.toString());

    const response = await this.client.get(`/channels/${channelId}/messages?${params}`);
    return response.data.messages;
  }

  // Get server info
  async getServer(serverId: number) {
    const response = await this.client.get(`/servers/${serverId}`);
    return response.data.server;
  }

  // Get server channels
  async getChannels(serverId: number) {
    const response = await this.client.get(`/servers/${serverId}/channels`);
    return response.data.channels;
  }

  // Get server members
  async getMembers(serverId: number) {
    const response = await this.client.get(`/servers/${serverId}/members`);
    return response.data.members;
  }

  // Event handlers for webhook events
  on(eventType: string, handler: Function) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // Handle incoming webhook
  handleWebhook(payload: WebhookEvent, signature?: string, secret?: string): boolean {
    // Verify signature if provided
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return false;
      }
    }

    // Dispatch event to handlers
    const handlers = this.eventHandlers.get(payload.event_type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload.data);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });
    }

    return true;
  }

  // Command framework
  private commands: Map<string, CommandHandler> = new Map();

  registerCommand(name: string, handler: CommandHandler) {
    this.commands.set(name, handler);
  }

  async handleCommand(message: Message, prefix: string = '!') {
    const content = message.content.trim();
    
    if (!content.startsWith(prefix)) {
      return;
    }

    const args = content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) {
      return;
    }

    const handler = this.commands.get(commandName);
    
    if (handler) {
      try {
        await handler(message, args);
      } catch (error) {
        console.error(`Command error [${commandName}]:`, error);
        await this.sendMessage(message.channel_id, `Error executing command: ${commandName}`);
      }
    }
  }
}

export interface CommandHandler {
  (message: Message, args: string[]): Promise<void> | void;
}

// Helper function to create webhook server
export function createWebhookServer(bot: DiscordCloneBot, port: number, secret?: string) {
  const express = require('express');
  const app = express();
  
  app.use(express.json());

  app.post('/webhook', (req: any, res: any) => {
    const signature = req.headers['x-webhook-signature'];
    const success = bot.handleWebhook(req.body, signature, secret);
    
    if (success) {
      res.json({ received: true });
    } else {
      res.status(401).json({ error: 'Invalid signature' });
    }
  });

  app.listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
  });

  return app;
}

// Example usage:
/*
const bot = new DiscordCloneBot({
  token: 'bot_your_token_here'
});

// Register commands
bot.registerCommand('ping', async (message, args) => {
  await bot.sendMessage(message.channel_id, 'Pong! 🏓');
});

bot.registerCommand('hello', async (message, args) => {
  await bot.sendMessage(message.channel_id, `Hello ${args[0] || 'World'}!`);
});

// Listen to events
bot.on('message.create', async (data) => {
  await bot.handleCommand(data, '!');
});

bot.on('member.join', async (data) => {
  console.log(`New member joined: ${data.user_id}`);
});

// Start webhook server
createWebhookServer(bot, 3002, 'your_webhook_secret');
*/
