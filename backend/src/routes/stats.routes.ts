import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import {
  getStatList,
  getLatestStats,
  getTrendStats,
  calculateAndSaveStats,
  calculateWaterQualityComplianceRate,
  calculateGovernanceCompletionRate,
  calculatePublicSatisfaction,
  calculateOutletAbnormalityIndex,
  getDashboardStats,
  IStatQuery,
} from '../services/realtimeStats.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';
import { StatType, StatPeriod } from '../models/enums';

const router = Router();

const calculateSchema = Joi.object({
  regionId: Joi.number(),
  waterBodyId: Joi.number(),
  outletId: Joi.number(),
  projectId: Joi.number(),
  days: Joi.number().min(1).max(365),
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

    const query: IStatQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      statType: req.query.statType ? (req.query.statType as unknown as StatType) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      outletId: req.query.outletId ? parseInt(req.query.outletId as string) : undefined,
      projectId: req.query.projectId ? parseInt(req.query.projectId as string) : undefined,
      statPeriod: req.query.statPeriod as StatPeriod,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const { rows, count } = await getStatList(query);

    paginate(res, rows, query.page!, query.pageSize!, count, '获取统计列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取统计列表失败';
    error(res, message, 500);
  }
});

router.get('/latest', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const statType = req.query.statType ? (req.query.statType as unknown as StatType) : undefined;
    if (!statType) {
      error(res, '统计类型不能为空', 400);
      return;
    }

    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    const waterBodyId = req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined;
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;

    const stats = await getLatestStats(statType, regionId, waterBodyId, outletId, projectId);

    success(res, stats, '获取最新统计数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取最新统计数据失败';
    error(res, message, 500);
  }
});

router.get('/trend', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const statType = req.query.statType ? (req.query.statType as unknown as StatType) : undefined;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!statType || !startDate || !endDate) {
      error(res, '统计类型和日期范围不能为空', 400);
      return;
    }

    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    const waterBodyId = req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined;
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;

    const stats = await getTrendStats(statType, startDate, endDate, regionId, waterBodyId, outletId, projectId);

    success(res, stats, '获取趋势统计数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取趋势统计数据失败';
    error(res, message, 500);
  }
});

router.get('/calculate/water-quality', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const { error: validationError } = calculateSchema.validate(req.query);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    const waterBodyId = req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined;
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : 7;

    const result = await calculateWaterQualityComplianceRate(regionId, waterBodyId, outletId, days);

    success(res, result, '计算水质达标率成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '计算水质达标率失败';
    error(res, message, 500);
  }
});

router.get('/calculate/governance', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const { error: validationError } = calculateSchema.validate(req.query);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    const waterBodyId = req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined;
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;

    const result = await calculateGovernanceCompletionRate(regionId, waterBodyId, projectId);

    success(res, result, '计算治理完成率成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '计算治理完成率失败';
    error(res, message, 500);
  }
});

router.get('/calculate/satisfaction', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const { error: validationError } = calculateSchema.validate(req.query);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    const waterBodyId = req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const result = await calculatePublicSatisfaction(regionId, waterBodyId, days);

    success(res, result, '计算公众满意度成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '计算公众满意度失败';
    error(res, message, 500);
  }
});

router.get('/calculate/outlet-abnormal', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const { error: validationError } = calculateSchema.validate(req.query);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    const waterBodyId = req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined;
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : 3;

    const result = await calculateOutletAbnormalityIndex(regionId, waterBodyId, outletId, days);

    success(res, result, '计算排污口异常指数成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '计算排污口异常指数失败';
    error(res, message, 500);
  }
});

router.post('/recalculate', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const statDate = req.body.statDate ? new Date(req.body.statDate) : new Date();

    await calculateAndSaveStats(statDate);

    success(res, null, '重新计算统计数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '重新计算统计数据失败';
    error(res, message, 500);
  }
});

router.get('/dashboard', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const province = req.query.province as string;
    const waterLevel = req.query.waterLevel as string;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const data = await getDashboardStats(province, waterLevel, days);
    success(res, data, '获取看板数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取看板数据失败';
    error(res, message, 500);
  }
});

export default router;
