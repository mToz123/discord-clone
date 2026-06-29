// Reaction Routes
import { Router } from 'express';
import { ReactionController } from '../controllers/ReactionController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Reaction routes
router.post('/messages/:messageId/reactions', ReactionController.add);
router.delete('/messages/:messageId/reactions/:emoji', ReactionController.remove);
router.get('/messages/:messageId/reactions', ReactionController.getMessageReactions);

export default router;
