// File Upload Controller
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { upload, FileUtil } from '../utils/upload';
import { v4 as uuidv4 } from 'uuid';

export class UploadController {
  // Upload file
  static async uploadFile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const attachment = {
        id: uuidv4(),
        filename: file.originalname,
        url: FileUtil.getFileUrl(file.filename),
        size: file.size,
        mimetype: file.mimetype,
      };

      return res.json({ attachment });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to upload file' });
    }
  }

  // Get upload middleware
  static getUploadMiddleware() {
    return upload.single('file');
  }
}
