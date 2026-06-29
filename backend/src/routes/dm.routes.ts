import { Router } from 'express';
import { DirectMessageController, FriendshipController } from '../controllers/DirectMessageController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// DM Conversations
router.get('/conversations', DirectMessageController.getConversations);
router.get('/conversations/unread', DirectMessageController.getUnreadCount);
router.get('/conversations/user/:userId', DirectMessageController.getOrCreateConversation);
router.get('/conversations/:id', DirectMessageController.getConversation);
router.get('/conversations/:id/messages', DirectMessageController.getMessages);
router.post('/conversations/:id/messages', DirectMessageController.sendMessage);
router.post('/conversations/:id/read', DirectMessageController.markAsRead);

// DM Messages
router.put('/messages/:messageId', DirectMessageController.editMessage);
router.delete('/messages/:messageId', DirectMessageController.deleteMessage);

// Friendships
router.get('/friends', FriendshipController.getFriends);
router.get('/friends/pending', FriendshipController.getPendingRequests);
router.get('/friends/status/:userId', FriendshipController.getStatus);
router.post('/friends/:userId', FriendshipController.sendRequest);
router.post('/friends/:userId/accept', FriendshipController.acceptRequest);
router.delete('/friends/:userId', FriendshipController.removeFriend);
router.post('/friends/:userId/block', FriendshipController.blockUser);

export default router;
