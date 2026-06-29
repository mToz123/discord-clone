// Auth Controller
import { Request, Response } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { JWTUtil } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth.middleware';

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response) {
    try {
      // Validate input
      const data = registerSchema.parse(req.body);

      // Check if user exists
      const existingUser = await UserModel.findByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email already registered',
        });
      }

      const existingUsername = await UserModel.findByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Username already taken',
        });
      }

      // Create user
      const user = await UserModel.create(
        data.username,
        data.email,
        data.password
      );

      // Generate token
      const token = JWTUtil.generate({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      return res.status(201).json({
        user,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      console.error('Register error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register user',
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response) {
    try {
      // Validate input
      const data = loginSchema.parse(req.body);

      // Find user
      const user = await UserModel.findByEmail(data.email);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValid = await UserModel.verifyPassword(user, data.password);
      if (!isValid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Update status to online
      await UserModel.updateStatus(user.id, 'online');

      // Generate token
      const token = JWTUtil.generate({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      return res.json({
        user: UserModel.sanitize(user),
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      console.error('Login error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to login',
      });
    }
  }

  // Get current user
  static async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Not authenticated',
        });
      }

      const user = await UserModel.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return res.json({ user });
    } catch (error) {
      console.error('Get me error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user',
      });
    }
  }

  // Logout user
  static async logout(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Not authenticated',
        });
      }

      // Update status to offline
      await UserModel.updateStatus(req.user.userId, 'offline');

      return res.json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to logout',
      });
    }
  }

  // Update profile
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Not authenticated',
        });
      }

      const updateSchema = z.object({
        username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
        bio: z.string().max(500).optional(),
        avatar_url: z.string().url().optional(),
      });

      const data = updateSchema.parse(req.body);

      // Check username uniqueness if changing
      if (data.username) {
        const existing = await UserModel.findByUsername(data.username);
        if (existing && existing.id !== req.user.userId) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Username already taken',
          });
        }
      }

      const user = await UserModel.updateProfile(req.user.userId, data);

      return res.json({ user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      console.error('Update profile error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update profile',
      });
    }
  }
}
