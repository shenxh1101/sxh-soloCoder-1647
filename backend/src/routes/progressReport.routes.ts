import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/permissions';
import { UserRole, ReportStatus } from '../models/enums';
import {
  getProgressReportList,
  getProgressReportById,
  createProgressReport,
  updateProgressReport,
  deleteProgressReport,
  submitProgressReport,
  reviewProgressReport,
  getProgressTrend,
  IProgressReportQuery,
  IProgressTrendQuery,
} from '../services/progressReport.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';

const router = Router();

const createSchema = Joi.object({
  projectId: Joi.number().required(),
  reportPeriod: Joi.string().required().max(10),
  reportDate: Joi.date().required(),
  monthlyPlannedProgress: Joi.number().min(0).max(100).required(),
  monthlyActualProgress: Joi.number().min(0).max(100).required(),
  cumulativePlannedProgress: Joi.number().min(0).max(100).required(),
  cumulativeActualProgress: Joi.number().min(0).max(100).required(),
  monthlyWorkContent: Joi.string().allow(null, ''),
  monthlyProblems: Joi.string().allow(null, ''),
  nextMonthPlan: Joi.string().allow(null, ''),
  monthlyInvestmentPlan: Joi.number().min(0).allow(null),
  monthlyActualInvestment: Joi.number().min(0).allow(null),
  cumulativeInvestment: Joi.number().min(0).allow(null),
  remarks: Joi.string().allow(null, ''),
});

const updateSchema = Joi.object({
  projectId: Joi.number(),
  reportPeriod: Joi.string().max(10),
  reportDate: Joi.date(),
  monthlyPlannedProgress: Joi.number().min(0).max(100),
  monthlyActualProgress: Joi.number().min(0).max(100),
  cumulativePlannedProgress: Joi.number().min(0).max(100),
  cumulativeActualProgress: Joi.number().min(0).max(100),
  monthlyWorkContent: Joi.string().allow(null, ''),
  monthlyProblems: Joi.string().allow(null, ''),
  nextMonthPlan: Joi.string().allow(null, ''),
  monthlyInvestmentPlan: Joi.number().min(0).allow(null),
  monthlyActualInvestment: Joi.number().min(0).allow(null),
  cumulativeInvestment: Joi.number().min(0).allow(null),
  remarks: Joi.string().allow(null, ''),
});

const reviewSchema = Joi.object({
  approved: Joi.boolean().required(),
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

    const query: IProgressReportQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      projectId: req.query.projectId ? parseInt(req.query.projectId as string) : undefined,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      reportPeriod: req.query.reportPeriod as string,
      reportStatus: req.query.reportStatus ? parseInt(req.query.reportStatus as string) as ReportStatus : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
    };

    const { rows, count } = await getProgressReportList(query, currentUser);
    paginate(res, rows, query.page!, query.pageSize!, count, '获取进度月报列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取进度月报列表失败';
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

    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;

    if (!projectId || !startTime || !endTime) {
      error(res, '缺少必要参数：projectId、startTime、endTime', 400);
      return;
    }

    const query: IProgressTrendQuery = { projectId, startTime, endTime };
    const data = await getProgressTrend(query, currentUser);
    success(res, data, '获取进度趋势成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取进度趋势失败';
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

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      error(res, '无效的报告ID', 400);
      return;
    }

    const data = await getProgressReportById(reportId, currentUser);
    if (!data) {
      error(res, '进度月报不存在', 404);
      return;
    }

    success(res, data, '获取进度月报详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取进度月报详情失败';
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

    const data = await createProgressReport(req.body, currentUser);
    success(res, data, '创建进度月报成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建进度月报失败';
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

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      error(res, '无效的报告ID', 400);
      return;
    }

    const { error: validationError } = updateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateProgressReport(reportId, req.body, currentUser);
    if (!data) {
      error(res, '进度月报不存在', 404);
      return;
    }

    success(res, data, '更新进度月报成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新进度月报失败';
    error(res, message, 400);
  }
});

router.put('/:id/submit', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      error(res, '无效的报告ID', 400);
      return;
    }

    const data = await submitProgressReport(reportId, currentUser);
    if (!data) {
      error(res, '进度月报不存在', 404);
      return;
    }

    success(res, data, '提交进度月报成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交进度月报失败';
    error(res, message, 400);
  }
});

router.put('/:id/review', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      error(res, '无效的报告ID', 400);
      return;
    }

    const { error: validationError } = reviewSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await reviewProgressReport(reportId, req.body.approved, currentUser);
    if (!data) {
      error(res, '进度月报不存在', 404);
      return;
    }

    success(res, data, `${req.body.approved ? '审核通过' : '审核拒绝'}进度月报成功`);
  } catch (err) {
    const message = err instanceof Error ? err.message : '审核进度月报失败';
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

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      error(res, '无效的报告ID', 400);
      return;
    }

    const result = await deleteProgressReport(reportId, currentUser);
    if (!result) {
      error(res, '进度月报不存在', 404);
      return;
    }

    success(res, null, '删除进度月报成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除进度月报失败';
    error(res, message, 400);
  }
});

export default router;
