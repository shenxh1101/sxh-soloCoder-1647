import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import {
  login,
  logout,
  refreshToken,
  changePassword,
  getUserById,
} from '../services/auth.service';
import { success, error } from '../utils/response';

const router = Router();

const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  password: Joi.string().required().min(6).max(50),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().min(6).max(50),
  newPassword: Joi.string().required().min(6).max(50),
});

const extractToken = (req: Request): string => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
};

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error: validationError } = loginSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await login({
      ...req.body,
      ip,
      userAgent,
    });

    success(res, result, '登录成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '登录失败';
    error(res, message, 401);
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const accessToken = extractToken(req);
    const { refreshToken: refreshTokenStr } = req.body;

    await logout(accessToken, refreshTokenStr);

    success(res, null, '登出成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '登出失败';
    error(res, message, 500);
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error: validationError } = refreshTokenSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const result = await refreshToken(req.body.refreshToken);

    success(res, result, 'Token刷新成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token刷新失败';
    error(res, message, 401);
  }
});

router.get('/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user) {
      error(res, '用户不存在', 404);
      return;
    }

    success(res, user, '获取用户信息成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取用户信息失败';
    error(res, message, 500);
  }
});

router.put('/password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const { error: validationError } = changePasswordSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    await changePassword(
      req.user.userId,
      req.body.oldPassword,
      req.body.newPassword
    );

    success(res, null, '密码修改成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '密码修改失败';
    error(res, message, 400);
  }
});

export default router;
