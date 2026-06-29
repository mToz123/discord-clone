// Channel Routes
import { Router } from 'express';
import { ChannelController } from '../controllers/ChannelController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Channel routes
router.post('/servers/:serverId/channels', ChannelController.create);
router.get('/:channelId', ChannelController.getChannel);
router.patch('/:channelId', ChannelController.update);
router.delete('/:channelId', ChannelController.delete);

export default router;
