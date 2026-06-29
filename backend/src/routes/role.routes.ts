import { Router } from 'express';
import { RoleController } from '../controllers/RoleController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Server roles
router.post('/servers/:serverId/roles', RoleController.create);
router.get('/servers/:serverId/roles', RoleController.getRoles);
router.patch('/roles/:roleId', RoleController.update);
router.delete('/roles/:roleId', RoleController.delete);

// Member roles
router.post('/servers/:serverId/members/:memberId/roles/:roleId', RoleController.assignRole);
router.delete('/servers/:serverId/members/:memberId/roles/:roleId', RoleController.removeRole);
router.get('/servers/:serverId/members/:memberId/roles', RoleController.getMemberRoles);

// Channel permission overrides
router.post('/channels/:channelId/permissions', RoleController.setChannelOverride);
router.get('/channels/:channelId/permissions', RoleController.getChannelOverrides);
router.delete('/channels/:channelId/permissions', RoleController.deleteChannelOverride);

export default router;
