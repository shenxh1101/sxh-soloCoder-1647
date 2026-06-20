import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { JwtPayload } from '../types/express';
import { User } from '../models/User';
import redis from '../config/redis';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        timestamp: Date.now()
      });
      return;
    }

    const isBlacklisted = await redis.get(`token:blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({
        code: 401,
        message: '令牌已失效',
        timestamp: Date.now()
      });
      return;
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

    const user = await User.findByPk(decoded.userId, {
      attributes: ['userId', 'username', 'realName', 'userLevel', 'regionId', 'role', 'permissions', 'isActive']
    });

    if (!user) {
      res.status(401).json({
        code: 401,
        message: '用户不存在',
        timestamp: Date.now()
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        code: 401,
        message: '账户已被禁用',
        timestamp: Date.now()
      });
      return;
    }

    req.user = {
      userId: user.userId,
      username: user.username,
      realName: user.realName,
      userLevel: user.userLevel,
      regionId: user.regionId,
      role: user.role,
      permissions: user.permissions
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        code: 401,
        message: '令牌已过期',
        timestamp: Date.now()
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        code: 401,
        message: '无效的令牌',
        timestamp: Date.now()
      });
      return;
    }

    res.status(401).json({
      code: 401,
      message: '认证失败',
      timestamp: Date.now()
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

    const user = await User.findByPk(decoded.userId, {
      attributes: ['userId', 'username', 'realName', 'userLevel', 'regionId', 'role', 'permissions', 'isActive']
    });

    if (user && user.isActive) {
      req.user = {
        userId: user.userId,
        username: user.username,
        realName: user.realName,
        userLevel: user.userLevel,
        regionId: user.regionId,
        role: user.role,
        permissions: user.permissions
      };
    }

    next();
  } catch (error) {
    next();
  }
};

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  if (req.body && req.body.token) {
    return req.body.token;
  }

  return null;
}



export const invalidateToken = async (token: string): Promise<void> => {
  const decoded = jwt.decode(token) as JwtPayload;
  if (decoded && decoded.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.set(`token:blacklist:${token}`, '1', 'EX', ttl);
    }
  }
};
