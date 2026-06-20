import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/permissions';
import { UserRole, OutletType, DischargeMethod } from '../models/enums';
import {
  getSewageOutletList,
  getSewageOutletById,
  createSewageOutlet,
  updateSewageOutlet,
  deleteSewageOutlet,
  toggleOutletStatus,
  getNearbyOutlets,
  getOutletsByRegion,
  getOutletsByWaterBody,
  ISewageOutletQuery,
  INearbyQuery,
} from '../services/sewageOutlet.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';

const router = Router();

const createSchema = Joi.object({
  outletCode: Joi.string().required().max(50),
  outletName: Joi.string().required().max(100),
  waterBodyId: Joi.number().required(),
  outletType: Joi.number().valid(OutletType.INDUSTRIAL, OutletType.DOMESTIC, OutletType.MIXED, OutletType.AGRICULTURAL).required(),
  dischargeMethod: Joi.number().valid(DischargeMethod.DIRECT, DischargeMethod.OVERFLOW, DischargeMethod.UNDERGROUND).allow(null),
  designDischargeCapacity: Joi.number().min(0).allow(null),
  actualDischargeCapacity: Joi.number().min(0).allow(null),
  location: Joi.object().required(),
  address: Joi.string().max(200).allow(null, ''),
  dischargeStandard: Joi.string().max(50).allow(null, ''),
  monitoringEquipment: Joi.string().max(200).allow(null, ''),
  monitoringFrequency: Joi.string().max(50).allow(null, ''),
  responsibleUnit: Joi.string().max(200).allow(null, ''),
  contactPerson: Joi.string().max(50).allow(null, ''),
  contactPhone: Joi.string().max(20).allow(null, ''),
  nh3nLimit: Joi.number().min(0).allow(null),
  tpLimit: Joi.number().min(0).allow(null),
  codLimit: Joi.number().min(0).allow(null),
  isMonitored: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true),
});

const updateSchema = Joi.object({
  outletCode: Joi.string().max(50),
  outletName: Joi.string().max(100),
  waterBodyId: Joi.number(),
  outletType: Joi.number().valid(OutletType.INDUSTRIAL, OutletType.DOMESTIC, OutletType.MIXED, OutletType.AGRICULTURAL),
  dischargeMethod: Joi.number().valid(DischargeMethod.DIRECT, DischargeMethod.OVERFLOW, DischargeMethod.UNDERGROUND).allow(null),
  designDischargeCapacity: Joi.number().min(0).allow(null),
  actualDischargeCapacity: Joi.number().min(0).allow(null),
  location: Joi.object(),
  address: Joi.string().max(200).allow(null, ''),
  dischargeStandard: Joi.string().max(50).allow(null, ''),
  monitoringEquipment: Joi.string().max(200).allow(null, ''),
  monitoringFrequency: Joi.string().max(50).allow(null, ''),
  responsibleUnit: Joi.string().max(200).allow(null, ''),
  contactPerson: Joi.string().max(50).allow(null, ''),
  contactPhone: Joi.string().max(20).allow(null, ''),
  nh3nLimit: Joi.number().min(0).allow(null),
  tpLimit: Joi.number().min(0).allow(null),
  codLimit: Joi.number().min(0).allow(null),
  isMonitored: Joi.boolean(),
  isActive: Joi.boolean(),
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

    const query: ISewageOutletQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      outletCode: req.query.outletCode as string,
      outletName: req.query.outletName as string,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      outletType: req.query.outletType ? parseInt(req.query.outletType as string) as OutletType : undefined,
      isMonitored: req.query.isMonitored !== undefined ? req.query.isMonitored === 'true' : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    };

    const { rows, count } = await getSewageOutletList(query, currentUser);
    paginate(res, rows, query.page!, query.pageSize!, count, '获取排污口列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取排污口列表失败';
    error(res, message, 500);
  }
});

router.get('/nearby', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const longitude = parseFloat(req.query.longitude as string);
    const latitude = parseFloat(req.query.latitude as string);
    const radius = parseFloat(req.query.radius as string);

    if (isNaN(longitude) || isNaN(latitude) || isNaN(radius)) {
      error(res, '请提供有效的经纬度和半径', 400);
      return;
    }

    const query: INearbyQuery = {
      longitude,
      latitude,
      radius,
      outletType: req.query.outletType ? parseInt(req.query.outletType as string) as OutletType : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : true,
    };

    const data = await getNearbyOutlets(query, currentUser);
    success(res, data, '获取附近排污口成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取附近排污口失败';
    error(res, message, 500);
  }
});

router.get('/region/:regionId', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const regionId = parseInt(req.params.regionId);
    if (isNaN(regionId)) {
      error(res, '无效的区域ID', 400);
      return;
    }

    const data = await getOutletsByRegion(regionId, currentUser);
    success(res, data, '获取区域排污口列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取区域排污口列表失败';
    error(res, message, 500);
  }
});

router.get('/water-body/:waterBodyId', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const waterBodyId = parseInt(req.params.waterBodyId);
    if (isNaN(waterBodyId)) {
      error(res, '无效的水体ID', 400);
      return;
    }

    const data = await getOutletsByWaterBody(waterBodyId, currentUser);
    success(res, data, '获取水体排污口列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取水体排污口列表失败';
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

    const outletId = parseInt(req.params.id);
    if (isNaN(outletId)) {
      error(res, '无效的排污口ID', 400);
      return;
    }

    const data = await getSewageOutletById(outletId, currentUser);
    if (!data) {
      error(res, '排污口不存在', 404);
      return;
    }

    success(res, data, '获取排污口详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取排污口详情失败';
    error(res, message, 500);
  }
});

router.post('/', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const data = await createSewageOutlet(req.body, currentUser);
    success(res, data, '创建排污口成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建排污口失败';
    error(res, message, 400);
  }
});

router.put('/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const outletId = parseInt(req.params.id);
    if (isNaN(outletId)) {
      error(res, '无效的排污口ID', 400);
      return;
    }

    const { error: validationError } = updateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateSewageOutlet(outletId, req.body, currentUser);
    if (!data) {
      error(res, '排污口不存在', 404);
      return;
    }

    success(res, data, '更新排污口成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新排污口失败';
    error(res, message, 400);
  }
});

router.put('/:id/status', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const outletId = parseInt(req.params.id);
    if (isNaN(outletId)) {
      error(res, '无效的排污口ID', 400);
      return;
    }

    const { error: validationError } = toggleStatusSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await toggleOutletStatus(outletId, req.body.isActive, currentUser);
    if (!data) {
      error(res, '排污口不存在', 404);
      return;
    }

    success(res, data, `${req.body.isActive ? '启用' : '禁用'}排污口成功`);
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新排污口状态失败';
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

    const outletId = parseInt(req.params.id);
    if (isNaN(outletId)) {
      error(res, '无效的排污口ID', 400);
      return;
    }

    const result = await deleteSewageOutlet(outletId, currentUser);
    if (!result) {
      error(res, '排污口不存在', 404);
      return;
    }

    success(res, null, '删除排污口成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除排污口失败';
    error(res, message, 400);
  }
});

export default router;
