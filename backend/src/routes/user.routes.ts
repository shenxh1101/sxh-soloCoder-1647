import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import {
  getUserList,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetPassword,
  IUserQuery,
} from '../services/user.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';
import { UserLevel, UserRole } from '../models/enums';

const router = Router();

const createUserSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  password: Joi.string().required().min(6).max(50),
  realName: Joi.string().required().min(2).max(50),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).allow('', null),
  email: Joi.string().email().allow('', null),
  department: Joi.string().max(100).allow('', null),
  position: Joi.string().max(50).allow('', null),
  userLevel: Joi.number().valid(UserLevel.NATIONAL, UserLevel.PROVINCIAL, UserLevel.MUNICIPAL).required(),
  regionId: Joi.number().required(),
  role: Joi.string().valid(UserRole.ADMIN, UserRole.APPROVER, UserRole.AUDITOR, UserRole.VIEWER).default(UserRole.VIEWER),
  permissions: Joi.object().default({}),
  isActive: Joi.boolean().default(true),
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50),
  password: Joi.string().min(6).max(50),
  realName: Joi.string().min(2).max(50),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).allow('', null),
  email: Joi.string().email().allow('', null),
  department: Joi.string().max(100).allow('', null),
  position: Joi.string().max(50).allow('', null),
  userLevel: Joi.number().valid(UserLevel.NATIONAL, UserLevel.PROVINCIAL, UserLevel.MUNICIPAL),
  regionId: Joi.number(),
  role: Joi.string().valid(UserRole.ADMIN, UserRole.APPROVER, UserRole.AUDITOR, UserRole.VIEWER),
  permissions: Joi.object(),
  isActive: Joi.boolean(),
});

const toggleStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().required().min(6).max(50),
});

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const query: IUserQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      username: req.query.username as string,
      realName: req.query.realName as string,
      userLevel: req.query.userLevel ? parseInt(req.query.userLevel as string) as UserLevel : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      role: req.query.role as UserRole,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    };

    const { rows, count } = await getUserList(query, currentUser);

    paginate(res, rows, query.page!, query.pageSize!, count, '获取用户列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取用户列表失败';
    error(res, message, 500);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      error(res, '无效的用户ID', 400);
      return;
    }

    const user = await getUserById(userId, currentUser);
    if (!user) {
      error(res, '用户不存在', 404);
      return;
    }

    success(res, user, '获取用户详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取用户详情失败';
    error(res, message, 500);
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const { error: validationError } = createUserSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const user = await createUser(req.body, currentUser);

    success(res, user, '创建用户成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建用户失败';
    error(res, message, 400);
  }
});

router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      error(res, '无效的用户ID', 400);
      return;
    }

    const { error: validationError } = updateUserSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const user = await updateUser(userId, req.body, currentUser);
    if (!user) {
      error(res, '用户不存在', 404);
      return;
    }

    success(res, user, '更新用户成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新用户失败';
    error(res, message, 400);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      error(res, '无效的用户ID', 400);
      return;
    }

    const result = await deleteUser(userId, currentUser);
    if (!result) {
      error(res, '用户不存在', 404);
      return;
    }

    success(res, null, '删除用户成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除用户失败';
    error(res, message, 400);
  }
});

router.put('/:id/status', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      error(res, '无效的用户ID', 400);
      return;
    }

    const { error: validationError } = toggleStatusSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const user = await toggleUserStatus(userId, req.body.isActive, currentUser);
    if (!user) {
      error(res, '用户不存在', 404);
      return;
    }

    success(res, user, `${req.body.isActive ? '启用' : '禁用'}用户成功`);
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新用户状态失败';
    error(res, message, 400);
  }
});

router.put('/:id/password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      error(res, '无效的用户ID', 400);
      return;
    }

    const { error: validationError } = resetPasswordSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const result = await resetPassword(userId, req.body.password, currentUser);
    if (!result) {
      error(res, '用户不存在', 404);
      return;
    }

    success(res, null, '重置密码成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '重置密码失败';
    error(res, message, 400);
  }
});

export default router;
