// Server Routes
import { Router } from 'express';
import { ServerController } from '../controllers/ServerController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Server routes
router.post('/', ServerController.create);
router.get('/', ServerController.getUserServers);
router.get('/:serverId', ServerController.getServer);
router.patch('/:serverId', ServerController.update);
router.delete('/:serverId', ServerController.delete);
router.post('/:serverId/join', ServerController.join);
router.post('/:serverId/leave', ServerController.leave);

export default router;
