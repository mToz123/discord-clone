import { Router } from 'express';
import { BotController } from '../controllers/BotController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Bot management routes
router.post('/', BotController.create);
router.get('/', BotController.getMyBots);
router.get('/:id', BotController.getById);
router.put('/:id', BotController.update);
router.delete('/:id', BotController.delete);
router.post('/:id/regenerate-token', BotController.regenerateToken);

// Bot server management
router.post('/:id/servers/:serverId', BotController.addToServer);
router.delete('/:id/servers/:serverId', BotController.removeFromServer);

// Bot command management
router.post('/:id/commands', BotController.registerCommand);
router.get('/:id/commands', BotController.getCommands);
router.delete('/:id/commands/:commandName', BotController.deleteCommand);

// Bot event subscriptions
router.post('/:id/events', BotController.subscribeEvent);
router.get('/:id/events', BotController.getEvents);
router.delete('/:id/events/:eventType', BotController.unsubscribeEvent);

export default router;
