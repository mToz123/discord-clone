import axios from 'axios';
import crypto from 'crypto';
import { BotModel, BotEvent } from '../models/Bot';

export interface WebhookPayload {
  event_type: string;
  timestamp: string;
  data: any;
}

export class BotWebhookService {
  // Send webhook to bot
  static async sendWebhook(webhook: BotEvent, payload: WebhookPayload): Promise<boolean> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'Discord-Clone-Bot-Webhook/1.0'
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      await axios.post(webhook.webhook_url, payload, {
        headers,
        timeout: 5000, // 5 second timeout
        validateStatus: (status) => status >= 200 && status < 300
      });

      return true;
    } catch (error) {
      console.error('Webhook delivery error:', error);
      return false;
    }
  }

  // Generate HMAC signature for webhook verification
  static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  // Broadcast event to all subscribed bots
  static async broadcastEvent(
    eventType: string,
    data: any,
    serverId?: number
  ): Promise<void> {
    try {
      const webhooks = await BotModel.getActiveWebhooks(eventType, serverId);

      if (webhooks.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        data
      };

      // Send webhooks in parallel
      const promises = webhooks.map(webhook => this.sendWebhook(webhook, payload));
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Broadcast event error:', error);
    }
  }

  // Event helper functions
  static async onMessageCreate(message: any, serverId: number): Promise<void> {
    await this.broadcastEvent('message.create', message, serverId);
  }

  static async onMessageUpdate(message: any, serverId: number): Promise<void> {
    await this.broadcastEvent('message.update', message, serverId);
  }

  static async onMessageDelete(messageId: number, channelId: number, serverId: number): Promise<void> {
    await this.broadcastEvent('message.delete', { message_id: messageId, channel_id: channelId }, serverId);
  }

  static async onMemberJoin(userId: number, serverId: number): Promise<void> {
    await this.broadcastEvent('member.join', { user_id: userId, server_id: serverId }, serverId);
  }

  static async onMemberLeave(userId: number, serverId: number): Promise<void> {
    await this.broadcastEvent('member.leave', { user_id: userId, server_id: serverId }, serverId);
  }

  static async onReactionAdd(messageId: number, userId: number, emoji: string, serverId: number): Promise<void> {
    await this.broadcastEvent('reaction.add', { message_id: messageId, user_id: userId, emoji }, serverId);
  }

  static async onReactionRemove(messageId: number, userId: number, emoji: string, serverId: number): Promise<void> {
    await this.broadcastEvent('reaction.remove', { message_id: messageId, user_id: userId, emoji }, serverId);
  }

  static async onChannelCreate(channel: any, serverId: number): Promise<void> {
    await this.broadcastEvent('channel.create', channel, serverId);
  }

  static async onChannelUpdate(channel: any, serverId: number): Promise<void> {
    await this.broadcastEvent('channel.update', channel, serverId);
  }

  static async onChannelDelete(channelId: number, serverId: number): Promise<void> {
    await this.broadcastEvent('channel.delete', { channel_id: channelId, server_id: serverId }, serverId);
  }
}
