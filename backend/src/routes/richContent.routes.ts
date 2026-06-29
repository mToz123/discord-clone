import { Router } from 'express';
import { RichContentController } from '../controllers/RichContentController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Embeds
router.post('/messages/:messageId/embeds', RichContentController.createEmbed);
router.post('/link-preview', RichContentController.generateLinkPreview);

// Pins
router.post('/messages/:messageId/pin', RichContentController.pinMessage);
router.delete('/messages/:messageId/pin', RichContentController.unpinMessage);
router.get('/channels/:channelId/pins', RichContentController.getPinnedMessages);

// Search
router.get('/channels/:channelId/search', RichContentController.searchChannel);
router.get('/servers/:serverId/search', RichContentController.searchServer);

// Mentions
router.get('/mentions', RichContentController.getMentions);

export default router;
