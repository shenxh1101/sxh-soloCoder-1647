import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/permissions';
import { UserRole, WaterBodyType, WaterBodyLevel, GovernanceStage, WaterBodyStatus } from '../models/enums';
import {
  getWaterBodyList,
  getWaterBodyById,
  createWaterBody,
  updateWaterBody,
  deleteWaterBody,
  updateWaterBodyStatus,
  updateGovernanceStage,
  toggleWaterBodyStatus,
  IWaterBodyQuery,
} from '../services/waterBody.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';

const router = Router();

const createSchema = Joi.object({
  waterBodyCode: Joi.string().required().max(50),
  waterBodyName: Joi.string().required().max(100),
  waterBodyType: Joi.number().valid(WaterBodyType.RIVER, WaterBodyType.LAKE, WaterBodyType.POND, WaterBodyType.OTHER).required(),
  waterBodyLevel: Joi.number().valid(WaterBodyLevel.BLACK_ODOROUS, WaterBodyLevel.MILD_BLACK_ODOROUS, WaterBodyLevel.SEVERE_BLACK_ODOROUS, WaterBodyLevel.ELIMINATED).required(),
  regionId: Joi.number().required(),
  administrativeVillage: Joi.string().max(100).allow(null, ''),
  startPoint: Joi.object().allow(null),
  endPoint: Joi.object().allow(null),
  waterLength: Joi.number().min(0).allow(null),
  waterArea: Joi.number().min(0).allow(null),
  catchmentArea: Joi.number().min(0).allow(null),
  surroundingPopulation: Joi.number().integer().min(0).allow(null),
  governanceStage: Joi.number().valid(GovernanceStage.PLAN_FORMULATION, GovernanceStage.CONSTRUCTION, GovernanceStage.EFFECT_EVALUATION, GovernanceStage.LONG_TERM_MANAGEMENT),
  currentStatus: Joi.number().valid(WaterBodyStatus.UNDER_GOVERNANCE, WaterBodyStatus.COMPLETED, WaterBodyStatus.REBOUND, WaterBodyStatus.CLOSED),
  plannedCompletionDate: Joi.date().allow(null),
  actualCompletionDate: Joi.date().allow(null),
  totalInvestment: Joi.number().min(0).allow(null),
  usedFunds: Joi.number().min(0).allow(null),
  responsibleUnit: Joi.string().max(200).allow(null, ''),
  responsiblePerson: Joi.string().max(50).allow(null, ''),
  responsiblePhone: Joi.string().max(20).allow(null, ''),
  governanceMeasures: Joi.array().items(Joi.string()).allow(null),
  geom: Joi.object().allow(null),
  isActive: Joi.boolean().default(true),
});

const updateSchema = Joi.object({
  waterBodyCode: Joi.string().max(50),
  waterBodyName: Joi.string().max(100),
  waterBodyType: Joi.number().valid(WaterBodyType.RIVER, WaterBodyType.LAKE, WaterBodyType.POND, WaterBodyType.OTHER),
  waterBodyLevel: Joi.number().valid(WaterBodyLevel.BLACK_ODOROUS, WaterBodyLevel.MILD_BLACK_ODOROUS, WaterBodyLevel.SEVERE_BLACK_ODOROUS, WaterBodyLevel.ELIMINATED),
  regionId: Joi.number(),
  administrativeVillage: Joi.string().max(100).allow(null, ''),
  startPoint: Joi.object().allow(null),
  endPoint: Joi.object().allow(null),
  waterLength: Joi.number().min(0).allow(null),
  waterArea: Joi.number().min(0).allow(null),
  catchmentArea: Joi.number().min(0).allow(null),
  surroundingPopulation: Joi.number().integer().min(0).allow(null),
  governanceStage: Joi.number().valid(GovernanceStage.PLAN_FORMULATION, GovernanceStage.CONSTRUCTION, GovernanceStage.EFFECT_EVALUATION, GovernanceStage.LONG_TERM_MANAGEMENT),
  currentStatus: Joi.number().valid(WaterBodyStatus.UNDER_GOVERNANCE, WaterBodyStatus.COMPLETED, WaterBodyStatus.REBOUND, WaterBodyStatus.CLOSED),
  plannedCompletionDate: Joi.date().allow(null),
  actualCompletionDate: Joi.date().allow(null),
  totalInvestment: Joi.number().min(0).allow(null),
  usedFunds: Joi.number().min(0).allow(null),
  responsibleUnit: Joi.string().max(200).allow(null, ''),
  responsiblePerson: Joi.string().max(50).allow(null, ''),
  responsiblePhone: Joi.string().max(20).allow(null, ''),
  governanceMeasures: Joi.array().items(Joi.string()).allow(null),
  geom: Joi.object().allow(null),
  isActive: Joi.boolean(),
});

const updateStatusSchema = Joi.object({
  currentStatus: Joi.number().valid(WaterBodyStatus.UNDER_GOVERNANCE, WaterBodyStatus.COMPLETED, WaterBodyStatus.REBOUND, WaterBodyStatus.CLOSED).required(),
});

const updateStageSchema = Joi.object({
  governanceStage: Joi.number().valid(GovernanceStage.PLAN_FORMULATION, GovernanceStage.CONSTRUCTION, GovernanceStage.EFFECT_EVALUATION, GovernanceStage.LONG_TERM_MANAGEMENT).required(),
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

    const query: IWaterBodyQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      waterBodyCode: req.query.waterBodyCode as string,
      waterBodyName: req.query.waterBodyName as string,
      waterBodyType: req.query.waterBodyType ? parseInt(req.query.waterBodyType as string) as WaterBodyType : undefined,
      waterBodyLevel: req.query.waterBodyLevel ? parseInt(req.query.waterBodyLevel as string) as WaterBodyLevel : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      governanceStage: req.query.governanceStage ? parseInt(req.query.governanceStage as string) as GovernanceStage : undefined,
      currentStatus: req.query.currentStatus ? parseInt(req.query.currentStatus as string) as WaterBodyStatus : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    };

    const { rows, count } = await getWaterBodyList(query, currentUser);
    paginate(res, rows, query.page!, query.pageSize!, count, '获取水体列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取水体列表失败';
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

    const waterBodyId = parseInt(req.params.id);
    if (isNaN(waterBodyId)) {
      error(res, '无效的水体ID', 400);
      return;
    }

    const data = await getWaterBodyById(waterBodyId, currentUser);
    if (!data) {
      error(res, '水体不存在', 404);
      return;
    }

    success(res, data, '获取水体详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取水体详情失败';
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

    const data = await createWaterBody(req.body, currentUser);
    success(res, data, '创建水体成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建水体失败';
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

    const waterBodyId = parseInt(req.params.id);
    if (isNaN(waterBodyId)) {
      error(res, '无效的水体ID', 400);
      return;
    }

    const { error: validationError } = updateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateWaterBody(waterBodyId, req.body, currentUser);
    if (!data) {
      error(res, '水体不存在', 404);
      return;
    }

    success(res, data, '更新水体成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新水体失败';
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

    const waterBodyId = parseInt(req.params.id);
    if (isNaN(waterBodyId)) {
      error(res, '无效的水体ID', 400);
      return;
    }

    const { error: validationError } = updateStatusSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateWaterBodyStatus(waterBodyId, req.body.currentStatus, currentUser);
    if (!data) {
      error(res, '水体不存在', 404);
      return;
    }

    success(res, data, '更新水体状态成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新水体状态失败';
    error(res, message, 400);
  }
});

router.put('/:id/stage', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const waterBodyId = parseInt(req.params.id);
    if (isNaN(waterBodyId)) {
      error(res, '无效的水体ID', 400);
      return;
    }

    const { error: validationError } = updateStageSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateGovernanceStage(waterBodyId, req.body.governanceStage, currentUser);
    if (!data) {
      error(res, '水体不存在', 404);
      return;
    }

    success(res, data, '更新治理阶段成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新治理阶段失败';
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

    const waterBodyId = parseInt(req.params.id);
    if (isNaN(waterBodyId)) {
      error(res, '无效的水体ID', 400);
      return;
    }

    const { error: validationError } = toggleStatusSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await toggleWaterBodyStatus(waterBodyId, req.body.isActive, currentUser);
    if (!data) {
      error(res, '水体不存在', 404);
      return;
    }

    success(res, data, `${req.body.isActive ? '启用' : '禁用'}水体成功`);
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新水体状态失败';
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

    const waterBodyId = parseInt(req.params.id);
    if (isNaN(waterBodyId)) {
      error(res, '无效的水体ID', 400);
      return;
    }

    const result = await deleteWaterBody(waterBodyId, currentUser);
    if (!result) {
      error(res, '水体不存在', 404);
      return;
    }

    success(res, null, '删除水体成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除水体失败';
    error(res, message, 400);
  }
});

export default router;
