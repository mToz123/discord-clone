import { Router } from 'express';
import { BotApiController } from '../controllers/BotApiController';
import { authenticateBot, requireBotPermission, requireBotInServer } from '../middleware/bot.middleware';

const router = Router();

// All routes require bot authentication
router.use(authenticateBot);

// Bot info
router.get('/me', BotApiController.getMe);

// Send message as bot
router.post(
  '/channels/:channelId/messages',
  requireBotPermission('send_messages'),
  BotApiController.sendMessage
);

// Edit message
router.put(
  '/messages/:messageId',
  requireBotPermission('send_messages'),
  BotApiController.editMessage
);

// Delete message
router.delete(
  '/messages/:messageId',
  requireBotPermission('manage_messages'),
  BotApiController.deleteMessage
);

// Add reaction
router.post(
  '/messages/:messageId/reactions/:emoji',
  requireBotPermission('add_reactions'),
  BotApiController.addReaction
);

// Remove reaction
router.delete(
  '/messages/:messageId/reactions/:emoji',
  requireBotPermission('add_reactions'),
  BotApiController.removeReaction
);

// Get channel messages
router.get(
  '/channels/:channelId/messages',
  requireBotPermission('read_messages'),
  BotApiController.getMessages
);

// Get server info
router.get('/servers/:serverId', requireBotInServer, BotApiController.getServer);

// Get server channels
router.get('/servers/:serverId/channels', requireBotInServer, BotApiController.getChannels);

// Get server members
router.get('/servers/:serverId/members', requireBotInServer, BotApiController.getMembers);

export default router;
