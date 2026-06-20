import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/permissions';
import { UserRole, DataQuality, GovernanceStage } from '../models/enums';
import {
  getWaterQualityList,
  getWaterQualityById,
  batchImportWaterQuality,
  createWaterQuality,
  updateWaterQuality,
  deleteWaterQuality,
  getWaterQualityTrend,
  getAggregatedData,
  exportWaterQuality,
  IWaterQualityQuery,
  IWaterQualityTrendQuery,
  IAggregationQuery,
} from '../services/waterQuality.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';

const router = Router();

const createSchema = Joi.object({
  outletId: Joi.number().required(),
  monitorTime: Joi.date().required(),
  waterTemperature: Joi.number().min(-20).max(50).allow(null),
  phValue: Joi.number().min(0).max(14).allow(null),
  dissolvedOxygen: Joi.number().min(0).allow(null),
  ammoniaNitrogen: Joi.number().min(0).allow(null),
  totalPhosphorus: Joi.number().min(0).allow(null),
  totalNitrogen: Joi.number().min(0).allow(null),
  cod: Joi.number().min(0).allow(null),
  bod5: Joi.number().min(0).allow(null),
  transparency: Joi.number().min(0).allow(null),
  oxidationReductionPotential: Joi.number().allow(null),
  conductivity: Joi.number().min(0).allow(null),
  turbidity: Joi.number().min(0).allow(null),
  flowRate: Joi.number().min(0).allow(null),
  dataQuality: Joi.number().valid(DataQuality.VALID, DataQuality.INVALID, DataQuality.REVISED, DataQuality.COMPLETED),
});

const batchImportSchema = Joi.object({
  data: Joi.array().items(createSchema).min(1).required(),
});

const updateSchema = Joi.object({
  outletId: Joi.number(),
  monitorTime: Joi.date(),
  waterTemperature: Joi.number().min(-20).max(50).allow(null),
  phValue: Joi.number().min(0).max(14).allow(null),
  dissolvedOxygen: Joi.number().min(0).allow(null),
  ammoniaNitrogen: Joi.number().min(0).allow(null),
  totalPhosphorus: Joi.number().min(0).allow(null),
  totalNitrogen: Joi.number().min(0).allow(null),
  cod: Joi.number().min(0).allow(null),
  bod5: Joi.number().min(0).allow(null),
  transparency: Joi.number().min(0).allow(null),
  oxidationReductionPotential: Joi.number().allow(null),
  conductivity: Joi.number().min(0).allow(null),
  turbidity: Joi.number().min(0).allow(null),
  flowRate: Joi.number().min(0).allow(null),
  dataQuality: Joi.number().valid(DataQuality.VALID, DataQuality.INVALID, DataQuality.REVISED, DataQuality.COMPLETED),
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

    const query: IWaterQualityQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      governanceStage: req.query.governanceStage ? parseInt(req.query.governanceStage as string) as GovernanceStage : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
      isCompliant: req.query.isCompliant !== undefined ? req.query.isCompliant === 'true' : undefined,
      isNh3nOverproof: req.query.isNh3nOverproof !== undefined ? req.query.isNh3nOverproof === 'true' : undefined,
      isTpOverproof: req.query.isTpOverproof !== undefined ? req.query.isTpOverproof === 'true' : undefined,
      dataQuality: req.query.dataQuality ? parseInt(req.query.dataQuality as string) as DataQuality : undefined,
    };

    const { rows, count } = await getWaterQualityList(query, currentUser);
    paginate(res, rows, query.page!, query.pageSize!, count, '获取水质数据列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取水质数据列表失败';
    error(res, message, 500);
  }
});

router.get('/trend', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    if (!req.query.startTime || !req.query.endTime) {
      error(res, '请指定时间范围', 400);
      return;
    }

    const query: IWaterQualityTrendQuery = {
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
      period: (req.query.period as 'day' | 'week' | 'month') || 'day',
    };

    const data = await getWaterQualityTrend(query, currentUser);
    success(res, data, '获取水质趋势数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取水质趋势数据失败';
    error(res, message, 500);
  }
});

router.get('/aggregation', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const groupBy = req.query.groupBy as 'waterBody' | 'region' | 'governanceStage';
    if (!groupBy || !['waterBody', 'region', 'governanceStage'].includes(groupBy)) {
      error(res, '请指定正确的聚合维度', 400);
      return;
    }

    const query: IAggregationQuery = {
      groupBy,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      governanceStage: req.query.governanceStage ? parseInt(req.query.governanceStage as string) as GovernanceStage : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
    };

    const data = await getAggregatedData(query, currentUser);
    success(res, data, '获取聚合数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取聚合数据失败';
    error(res, message, 500);
  }
});

router.get('/export', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const query: IWaterQualityQuery = {
      page: 1,
      pageSize: 10000,
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      governanceStage: req.query.governanceStage ? parseInt(req.query.governanceStage as string) as GovernanceStage : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
      isCompliant: req.query.isCompliant !== undefined ? req.query.isCompliant === 'true' : undefined,
      isNh3nOverproof: req.query.isNh3nOverproof !== undefined ? req.query.isNh3nOverproof === 'true' : undefined,
      isTpOverproof: req.query.isTpOverproof !== undefined ? req.query.isTpOverproof === 'true' : undefined,
      dataQuality: req.query.dataQuality ? parseInt(req.query.dataQuality as string) as DataQuality : undefined,
    };

    const data = await exportWaterQuality(query, currentUser);
    success(res, data, '导出水质数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '导出水质数据失败';
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

    const dataId = parseInt(req.params.id);
    if (isNaN(dataId)) {
      error(res, '无效的数据ID', 400);
      return;
    }

    const data = await getWaterQualityById(dataId, currentUser);
    if (!data) {
      error(res, '数据不存在', 404);
      return;
    }

    success(res, data, '获取水质数据详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取水质数据详情失败';
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

    const data = await createWaterQuality(req.body, currentUser);
    success(res, data, '创建水质数据成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建水质数据失败';
    error(res, message, 400);
  }
});

router.post('/batch', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const { error: validationError } = batchImportSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const result = await batchImportWaterQuality(req.body.data, currentUser);
    success(res, result, `批量导入完成，成功${result.success}条，失败${result.failed}条`);
  } catch (err) {
    const message = err instanceof Error ? err.message : '批量导入水质数据失败';
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

    const dataId = parseInt(req.params.id);
    if (isNaN(dataId)) {
      error(res, '无效的数据ID', 400);
      return;
    }

    const { error: validationError } = updateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateWaterQuality(dataId, req.body, currentUser);
    if (!data) {
      error(res, '数据不存在', 404);
      return;
    }

    success(res, data, '更新水质数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新水质数据失败';
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

    const dataId = parseInt(req.params.id);
    if (isNaN(dataId)) {
      error(res, '无效的数据ID', 400);
      return;
    }

    const result = await deleteWaterQuality(dataId, currentUser);
    if (!result) {
      error(res, '数据不存在', 404);
      return;
    }

    success(res, null, '删除水质数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除水质数据失败';
    error(res, message, 400);
  }
});

export default router;
