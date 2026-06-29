// Upload Routes
import { Router } from 'express';
import { UploadController } from '../controllers/UploadController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Upload file
router.post('/upload', UploadController.getUploadMiddleware(), UploadController.uploadFile);

export default router;
