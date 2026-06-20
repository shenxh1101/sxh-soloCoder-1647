import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/permissions';
import { UserRole, RegionLevel } from '../models/enums';
import {
  getRegionList,
  getRegionTree,
  getRegionById,
  createRegion,
  updateRegion,
  deleteRegion,
  toggleRegionStatus,
  getRegionStatistics,
  IRegionQuery,
  IRegionStatsQuery,
} from '../services/region.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';

const router = Router();

const createSchema = Joi.object({
  regionCode: Joi.string().required().max(50),
  regionName: Joi.string().required().max(100),
  regionLevel: Joi.number().valid(
    RegionLevel.NATIONAL,
    RegionLevel.PROVINCIAL,
    RegionLevel.MUNICIPAL
  ).required(),
  parentId: Joi.number().allow(null),
  regionAbbr: Joi.string().max(50).allow(null, ''),
  provinceName: Joi.string().max(100).allow(null, ''),
  cityName: Joi.string().max(100).allow(null, ''),
  countyName: Joi.string().max(100).allow(null, ''),
  geometry: Joi.object().allow(null),
  centroid: Joi.object().allow(null),
  area: Joi.number().min(0).allow(null),
  population: Joi.number().integer().min(0).allow(null),
  sortOrder: Joi.number().integer().default(0),
  isActive: Joi.boolean().default(true),
  remark: Joi.string().allow(null, ''),
});

const updateSchema = Joi.object({
  regionCode: Joi.string().max(50),
  regionName: Joi.string().max(100),
  regionLevel: Joi.number().valid(
    RegionLevel.NATIONAL,
    RegionLevel.PROVINCIAL,
    RegionLevel.MUNICIPAL
  ),
  parentId: Joi.number().allow(null),
  regionAbbr: Joi.string().max(50).allow(null, ''),
  provinceName: Joi.string().max(100).allow(null, ''),
  cityName: Joi.string().max(100).allow(null, ''),
  countyName: Joi.string().max(100).allow(null, ''),
  geometry: Joi.object().allow(null),
  centroid: Joi.object().allow(null),
  area: Joi.number().min(0).allow(null),
  population: Joi.number().integer().min(0).allow(null),
  sortOrder: Joi.number().integer(),
  isActive: Joi.boolean(),
  remark: Joi.string().allow(null, ''),
});

const toggleStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
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

    const query: IRegionQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      regionCode: req.query.regionCode as string,
      regionName: req.query.regionName as string,
      regionLevel: req.query.regionLevel ? parseInt(req.query.regionLevel as string) as RegionLevel : undefined,
      parentId: req.query.parentId !== undefined ? parseInt(req.query.parentId as string) : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    };

    const { rows, count } = await getRegionList(query, currentUser);
    paginate(res, rows, query.page!, query.pageSize!, count, '获取区域列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取区域列表失败';
    error(res, message, 500);
  }
});

router.get('/tree', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const data = await getRegionTree(currentUser);
    success(res, data, '获取区域树形结构成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取区域树形结构失败';
    error(res, message, 500);
  }
});

router.get('/statistics', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const query: IRegionStatsQuery = {
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
    };

    const data = await getRegionStatistics(query, currentUser);
    success(res, data, '获取区域统计成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取区域统计失败';
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

    const regionId = parseInt(req.params.id);
    if (isNaN(regionId)) {
      error(res, '无效的区域ID', 400);
      return;
    }

    const data = await getRegionById(regionId, currentUser);
    if (!data) {
      error(res, '区域不存在', 404);
      return;
    }

    success(res, data, '获取区域详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取区域详情失败';
    error(res, message, 500);
  }
});

router.post('/', authenticate, requireRole(UserRole.ADMIN), async (req: Request, res: Response): Promise<void> => {
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

    const { error: validationError } = createSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await createRegion(req.body, currentUser);
    success(res, data, '创建区域成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建区域失败';
    error(res, message, 400);
  }
});

router.put('/:id', authenticate, requireRole(UserRole.ADMIN), async (req: Request, res: Response): Promise<void> => {
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

    const regionId = parseInt(req.params.id);
    if (isNaN(regionId)) {
      error(res, '无效的区域ID', 400);
      return;
    }

    const { error: validationError } = updateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateRegion(regionId, req.body, currentUser);
    if (!data) {
      error(res, '区域不存在', 404);
      return;
    }

    success(res, data, '更新区域成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新区域失败';
    error(res, message, 400);
  }
});

router.put('/:id/active', authenticate, requireRole(UserRole.ADMIN), async (req: Request, res: Response): Promise<void> => {
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

    const regionId = parseInt(req.params.id);
    if (isNaN(regionId)) {
      error(res, '无效的区域ID', 400);
      return;
    }

    const { error: validationError } = toggleStatusSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await toggleRegionStatus(regionId, req.body.isActive, currentUser);
    if (!data) {
      error(res, '区域不存在', 404);
      return;
    }

    success(res, data, `${req.body.isActive ? '启用' : '禁用'}区域成功`);
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新区域状态失败';
    error(res, message, 400);
  }
});

router.delete('/:id', authenticate, requireRole(UserRole.ADMIN), async (req: Request, res: Response): Promise<void> => {
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

    const regionId = parseInt(req.params.id);
    if (isNaN(regionId)) {
      error(res, '无效的区域ID', 400);
      return;
    }

    const result = await deleteRegion(regionId, currentUser);
    if (!result) {
      error(res, '区域不存在', 404);
      return;
    }

    success(res, null, '删除区域成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除区域失败';
    error(res, message, 400);
  }
});

export default router;
