import jwt from 'jsonwebtoken';
import { User, IUserAttributes } from '../models/User';
import { OperationLog } from '../models/OperationLog';
import { comparePassword, hashPassword } from '../utils/encryption';
import { jwtConfig } from '../config';
import { redis } from '../config';
import { clearRegionCache } from './permission.service';
import { JwtPayload } from '../types/express';

export interface ILoginRequest {
  username: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<IUserAttributes, 'passwordHash'>;
}

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

export const generateAccessToken = (user: IUserAttributes): string => {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: user.userId,
    username: user.username,
    realName: user.realName,
    userLevel: user.userLevel,
    regionId: user.regionId,
    role: user.role,
    permissions: user.permissions,
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const generateRefreshToken = (user: IUserAttributes): string => {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: user.userId,
    username: user.username,
    realName: user.realName,
    userLevel: user.userLevel,
    regionId: user.regionId,
    role: user.role,
    permissions: user.permissions,
  };

  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, jwtConfig.secret) as JwtPayload;
  } catch (err) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret) as JwtPayload;
  } catch (err) {
    return null;
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const result = await redis.exists(`${TOKEN_BLACKLIST_PREFIX}${token}`);
    return result === 1;
  } catch (err) {
    console.warn('Failed to check token blacklist:', err);
    return false;
  }
};

export const blacklistToken = async (token: string, expiresIn: number = 86400): Promise<void> => {
  try {
    await redis.setex(`${TOKEN_BLACKLIST_PREFIX}${token}`, expiresIn, '1');
  } catch (err) {
    console.warn('Failed to blacklist token:', err);
  }
};

export const login = async (loginRequest: ILoginRequest): Promise<ILoginResponse> => {
  const { username, password, ip, userAgent } = loginRequest;

  const user = await User.findOne({
    where: { username },
  });

  if (!user) {
    await recordLoginLog(null, username, ip, userAgent, false, '用户不存在');
    throw new Error('用户名或密码错误');
  }

  if (!user.isActive) {
    await recordLoginLog(user.userId, username, ip, userAgent, false, '用户已被禁用');
    throw new Error('用户已被禁用');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    await recordLoginLog(user.userId, username, ip, userAgent, false, '密码错误');
    throw new Error('用户名或密码错误');
  }

  await User.update(
    {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    },
    {
      where: { userId: user.userId },
    }
  );

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await recordLoginLog(user.userId, username, ip, userAgent, true, '登录成功');

  const { passwordHash, ...userWithoutPassword } = user.toJSON();

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword as Omit<IUserAttributes, 'passwordHash'>,
  };
};

export const logout = async (accessToken: string, refreshToken?: string): Promise<void> => {
  await blacklistToken(accessToken);
  if (refreshToken) {
    await blacklistToken(refreshToken, 30 * 24 * 60 * 60);
  }
};

export const refreshToken = async (oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
  const isBlacklisted = await isTokenBlacklisted(oldRefreshToken);
  if (isBlacklisted) {
    throw new Error('Refresh token已失效');
  }

  const payload = verifyRefreshToken(oldRefreshToken);
  if (!payload) {
    throw new Error('无效的Refresh token');
  }

  const user = await User.findByPk(payload.userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  if (!user.isActive) {
    throw new Error('用户已被禁用');
  }

  await blacklistToken(oldRefreshToken, 30 * 24 * 60 * 60);

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const getFullUserById = async (userId: number): Promise<IUserAttributes | null> => {
  const user = await User.findByPk(userId);
  if (!user) {
    return null;
  }
  return user.toJSON() as IUserAttributes;
};

export const changePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const isPasswordValid = await comparePassword(oldPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('原密码错误');
  }

  const newPasswordHash = await hashPassword(newPassword);

  await User.update(
    {
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
    },
    {
      where: { userId },
    }
  );

  await clearRegionCache(userId);
};

export const recordLoginLog = async (
  userId: number | null,
  username: string,
  ip?: string,
  userAgent?: string,
  isSuccess: boolean = true,
  remark?: string
): Promise<void> => {
  try {
    await OperationLog.create({
      userId: userId || undefined,
      username,
      operationType: isSuccess ? 'login_success' : 'login_failure',
      moduleName: 'auth',
      operationContent: remark || (isSuccess ? '用户登录成功' : '用户登录失败'),
      ipAddress: ip,
      userAgent: userAgent?.substring(0, 500),
      isSuccess,
    });
  } catch (err) {
    console.error('Failed to record login log:', err);
  }
};

export const getUserById = async (userId: number): Promise<Omit<IUserAttributes, 'passwordHash'> | null> => {
  const user = await User.findByPk(userId);
  if (!user) {
    return null;
  }

  const { passwordHash, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword as Omit<IUserAttributes, 'passwordHash'>;
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isTokenBlacklisted,
  blacklistToken,
  login,
  logout,
  refreshToken,
  changePassword,
  recordLoginLog,
  getUserById,
  getFullUserById,
};
