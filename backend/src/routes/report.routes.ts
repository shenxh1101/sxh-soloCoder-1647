import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import {
  getReportList,
  getReportById,
  generateWeeklyReport,
  generateAllRegionsWeeklyReport,
  generateWeeklyReportData,
  exportReportToExcel,
  IReportQuery,
} from '../services/report.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

const generateReportSchema = Joi.object({
  regionId: Joi.number(),
  referenceDate: Joi.date(),
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

    const query: IReportQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      reportYear: req.query.reportYear ? parseInt(req.query.reportYear as string) : undefined,
      reportWeek: req.query.reportWeek ? parseInt(req.query.reportWeek as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const { rows, count } = await getReportList(query);

    paginate(res, rows, query.page!, query.pageSize!, count, '获取报告列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取报告列表失败';
    error(res, message, 500);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      error(res, '无效的报告ID', 400);
      return;
    }

    const report = await getReportById(reportId);
    if (!report) {
      error(res, '报告不存在', 404);
      return;
    }

    success(res, report, '获取报告详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取报告详情失败';
    error(res, message, 500);
  }
});

router.get('/:id/export', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      error(res, '无效的报告ID', 400);
      return;
    }

    const filePath = await exportReportToExcel(reportId);

    if (!fs.existsSync(filePath)) {
      error(res, '报告文件不存在', 404);
      return;
    }

    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error deleting temp file:', err);
        }
      }, 5000);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '导出报告失败';
    error(res, message, 500);
  }
});

router.get('/data/weekly', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    const referenceDate = req.query.referenceDate ? new Date(req.query.referenceDate as string) : new Date();

    if (!regionId) {
      error(res, '区域ID不能为空', 400);
      return;
    }

    const reportData = await generateWeeklyReportData(regionId, referenceDate);

    success(res, reportData, '获取周报数据成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取周报数据失败';
    error(res, message, 500);
  }
});

router.post('/generate/weekly', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const { error: validationError } = generateReportSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const report = await generateWeeklyReport(
      req.body.regionId,
      req.body.referenceDate ? new Date(req.body.referenceDate) : undefined,
      currentUser.userId
    );

    success(res, report, '生成周报成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成周报失败';
    error(res, message, 400);
  }
});

router.post('/generate/weekly/all', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const referenceDate = req.body.referenceDate ? new Date(req.body.referenceDate) : undefined;
    const reports = await generateAllRegionsWeeklyReport(referenceDate, currentUser.userId);

    success(res, { count: reports.length, reports }, '批量生成周报成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '批量生成周报失败';
    error(res, message, 500);
  }
});

export default router;
