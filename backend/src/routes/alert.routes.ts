import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import {
  getAlertList,
  getAlertDetail,
  getAlertById,
  handleAlert,
  resolveAlert,
  ignoreAlert,
  getAlertStatistics,
  detectAndCreateAlerts,
  IAlertHandleRequest,
} from '../services/alert.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';
import { AlertType, AlertLevel, AlertStatus, SourceType, UserLevel } from '../models/enums';

const mapFrontendLevelToBackend = (level: string): AlertLevel | undefined => {
  switch (level) {
    case 'critical': return AlertLevel.LEVEL_1;
    case 'high': return AlertLevel.LEVEL_2;
    case 'medium': return AlertLevel.LEVEL_3;
    case 'low': return AlertLevel.LEVEL_3;
    default: return undefined;
  }
};

const mapFrontendTypeToBackend = (type: string): AlertType | undefined => {
  switch (type) {
    case 'water_quality': return AlertType.WATER_QUALITY_OVERPROOF;
    case 'project': return AlertType.PROGRESS_DELAY;
    case 'fund': return AlertType.FUND_ABNORMAL;
    case 'complaint': return AlertType.COMPLAINT_CONCENTRATION;
    default: return undefined;
  }
};

const mapFrontendStatusToBackend = (status: string): AlertStatus | undefined => {
  switch (status) {
    case 'pending': return AlertStatus.PENDING;
    case 'processing': return AlertStatus.PROCESSING;
    case 'resolved': return AlertStatus.RESOLVED;
    case 'closed': return AlertStatus.IGNORED;
    default: return undefined;
  }
};

const router = Router();

const handleAlertSchema = Joi.object({
  handleMeasure: Joi.string().required().min(1).max(1000),
  handleResult: Joi.string().max(1000),
  handleFiles: Joi.object(),
  handlerUnit: Joi.string().max(100),
  handlerPerson: Joi.string().max(50),
});

const resolveAlertSchema = Joi.object({
  handleMeasure: Joi.string().required().min(1).max(1000),
  handleResult: Joi.string().required().min(1).max(1000),
  handleFiles: Joi.object(),
});

const ignoreAlertSchema = Joi.object({
  ignoreReason: Joi.string().required().min(1).max(500),
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

    const query = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      alertLevel: req.query.level ? mapFrontendLevelToBackend(req.query.level as string) : undefined,
      alertType: req.query.type ? mapFrontendTypeToBackend(req.query.type as string) : undefined,
      alertStatus: req.query.status ? mapFrontendStatusToBackend(req.query.status as string) : undefined,
      keyword: req.query.keyword as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
    };

    const { rows, count } = await getAlertList(query, currentUser);

    paginate(res, rows, query.page!, query.pageSize!, count, '获取预警列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取预警列表失败';
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

    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const stats = await getAlertStatistics(regionId, startDate, endDate);

    success(res, stats, '获取预警统计成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取预警统计失败';
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

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) {
      error(res, '无效的预警ID', 400);
      return;
    }

    const alert = await getAlertDetail(alertId, currentUser);
    if (!alert) {
      error(res, '预警不存在', 404);
      return;
    }

    success(res, alert, '获取预警详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取预警详情失败';
    error(res, message, 500);
  }
});

router.put('/:id/handle', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) {
      error(res, '无效的预警ID', 400);
      return;
    }

    const { error: validationError } = handleAlertSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const request: IAlertHandleRequest = {
      alertId,
      ...req.body,
    };

    const alert = await handleAlert(request, currentUser);
    if (!alert) {
      error(res, '预警不存在', 404);
      return;
    }

    success(res, alert, '预警处理成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '预警处理失败';
    error(res, message, 400);
  }
});

router.put('/:id/resolve', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) {
      error(res, '无效的预警ID', 400);
      return;
    }

    const { error: validationError } = resolveAlertSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const alert = await resolveAlert(alertId, req.body, currentUser);
    if (!alert) {
      error(res, '预警不存在', 404);
      return;
    }

    success(res, alert, '预警解除成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '预警解除失败';
    error(res, message, 400);
  }
});

router.put('/:id/ignore', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) {
      error(res, '无效的预警ID', 400);
      return;
    }

    const { error: validationError } = ignoreAlertSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const alert = await ignoreAlert(alertId, req.body.ignoreReason, currentUser);
    if (!alert) {
      error(res, '预警不存在', 404);
      return;
    }

    success(res, alert, '预警忽略成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '预警忽略失败';
    error(res, message, 400);
  }
});

router.post('/detect', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const alerts = await detectAndCreateAlerts();

    success(res, { count: alerts.length, alerts }, '预警检测完成');
  } catch (err) {
    const message = err instanceof Error ? err.message : '预警检测失败';
    error(res, message, 500);
  }
});

export default router;
