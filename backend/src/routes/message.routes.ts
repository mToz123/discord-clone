// Message Routes
import { Router } from 'express';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Message routes
router.post('/channels/:channelId/messages', MessageController.create);
router.get('/channels/:channelId/messages', MessageController.getMessages);
router.patch('/messages/:messageId', MessageController.update);
router.delete('/messages/:messageId', MessageController.delete);

export default router;
