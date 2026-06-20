import { Router, Request, Response } from 'express';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import {
  getTaskList,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  parseExcelFile,
  importAnnualTasks,
  createFundDisbursement,
  getFundList,
  validateFundTaskMatch,
  checkFundAbnormalAndPush,
  getTaskStatistics,
  ITaskQuery,
  IFundQuery,
  IImportResult,
} from '../services/task.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';
import { TaskType, TaskStatus, FundType, PaymentStatus } from '../models/enums';
import { config } from '../config';

const router = Router();

const uploadDir = path.join(process.cwd(), config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `task-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传Excel文件'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const createTaskSchema = Joi.object({
  year: Joi.number().required().min(2000).max(2100),
  regionId: Joi.number().required(),
  waterBodyId: Joi.number(),
  taskType: Joi.number().valid(
    TaskType.WATER_BODY_ELIMINATION,
    TaskType.PROJECT_CONSTRUCTION,
    TaskType.WATER_QUALITY_IMPROVEMENT,
    TaskType.ECOLOGICAL_RESTORATION
  ).required(),
  taskContent: Joi.string().required().min(1).max(1000),
  taskCode: Joi.string().max(50),
  plannedStartDate: Joi.date(),
  plannedEndDate: Joi.date(),
  plannedBudget: Joi.number().min(0),
  allocatedFunds: Joi.number().min(0).default(0),
  actualExpenditure: Joi.number().min(0).default(0),
  responsibleUnit: Joi.string().max(100),
  responsiblePerson: Joi.string().max(50),
  taskStatus: Joi.number().valid(
    TaskStatus.NOT_STARTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.DELAYED
  ).default(TaskStatus.NOT_STARTED),
  progress: Joi.number().min(0).max(100).default(0),
  priority: Joi.number().min(1).max(5).default(3),
  remarks: Joi.string().max(2000),
  attachments: Joi.object(),
});

const updateTaskSchema = Joi.object({
  year: Joi.number().min(2000).max(2100),
  regionId: Joi.number(),
  waterBodyId: Joi.number(),
  taskType: Joi.number().valid(
    TaskType.WATER_BODY_ELIMINATION,
    TaskType.PROJECT_CONSTRUCTION,
    TaskType.WATER_QUALITY_IMPROVEMENT,
    TaskType.ECOLOGICAL_RESTORATION
  ),
  taskContent: Joi.string().min(1).max(1000),
  taskCode: Joi.string().max(50),
  plannedStartDate: Joi.date(),
  plannedEndDate: Joi.date(),
  plannedBudget: Joi.number().min(0),
  allocatedFunds: Joi.number().min(0),
  actualExpenditure: Joi.number().min(0),
  responsibleUnit: Joi.string().max(100),
  responsiblePerson: Joi.string().max(50),
  taskStatus: Joi.number().valid(
    TaskStatus.NOT_STARTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.DELAYED
  ),
  progress: Joi.number().min(0).max(100),
  priority: Joi.number().min(1).max(5),
  remarks: Joi.string().max(2000),
  attachments: Joi.object(),
  isDeleted: Joi.boolean(),
});

const createFundSchema = Joi.object({
  taskId: Joi.number().required(),
  projectId: Joi.number(),
  fundType: Joi.number().valid(
    FundType.CENTRAL_FINANCE,
    FundType.PROVINCIAL_FINANCE,
    FundType.MUNICIPAL_FINANCE,
    FundType.SELF_FINANCING,
    FundType.OTHER
  ).required(),
  amount: Joi.number().required().min(0),
  paymentDate: Joi.date(),
  paymentStatus: Joi.number().valid(
    PaymentStatus.PENDING,
    PaymentStatus.PAID,
    PaymentStatus.REFUNDED
  ).default(PaymentStatus.PENDING),
  payer: Joi.string().max(100),
  receiver: Joi.string().max(100),
  bankAccount: Joi.string().max(50),
  voucherNumber: Joi.string().max(100),
  remarks: Joi.string().max(1000),
  attachments: Joi.object(),
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

    const query: ITaskQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      taskType: req.query.taskType ? (req.query.taskType as unknown as TaskType) : undefined,
      taskStatus: req.query.taskStatus ? (req.query.taskStatus as unknown as TaskStatus) : undefined,
      isBudgetAbnormal: req.query.isBudgetAbnormal === 'true',
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const { rows, count } = await getTaskList(query);

    paginate(res, rows, query.page!, query.pageSize!, count, '获取任务列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取任务列表失败';
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

    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;

    const stats = await getTaskStatistics(year, regionId);

    success(res, stats, '获取任务统计成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取任务统计失败';
    error(res, message, 500);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      error(res, '无效的任务ID', 400);
      return;
    }

    const task = await getTaskById(taskId);
    if (!task) {
      error(res, '任务不存在', 404);
      return;
    }

    success(res, task, '获取任务详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取任务详情失败';
    error(res, message, 500);
  }
});

router.get('/:id/funds', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      error(res, '无效的任务ID', 400);
      return;
    }

    const query: IFundQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      taskId,
      fundType: req.query.fundType ? (req.query.fundType as unknown as FundType) : undefined,
      paymentStatus: req.query.paymentStatus ? (req.query.paymentStatus as unknown as PaymentStatus) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const { rows, count } = await getFundList(query);

    paginate(res, rows, query.page!, query.pageSize!, count, '获取资金拨付记录成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取资金拨付记录失败';
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

    const { error: validationError } = createTaskSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const task = await createTask(req.body, currentUser);

    success(res, task, '创建任务成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建任务失败';
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

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      error(res, '无效的任务ID', 400);
      return;
    }

    const { error: validationError } = updateTaskSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const task = await updateTask(taskId, req.body, currentUser);
    if (!task) {
      error(res, '任务不存在', 404);
      return;
    }

    success(res, task, '更新任务成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新任务失败';
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

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      error(res, '无效的任务ID', 400);
      return;
    }

    const result = await deleteTask(taskId);
    if (!result) {
      error(res, '任务不存在', 404);
      return;
    }

    success(res, null, '删除任务成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除任务失败';
    error(res, message, 400);
  }
});

router.post('/import', authenticate, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
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

    if (!req.file) {
      error(res, '请上传Excel文件', 400);
      return;
    }

    const year = req.body.year ? parseInt(req.body.year as string) : new Date().getFullYear();

    const excelData = await parseExcelFile(req.file.path);
    const result: IImportResult = await importAnnualTasks(excelData, year, currentUser);

    fs.unlinkSync(req.file.path);

    success(res, result, '导入任务完成');
  } catch (err) {
    const message = err instanceof Error ? err.message : '导入任务失败';
    error(res, message, 400);
  }
});

router.post('/funds', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const { error: validationError } = createFundSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const fund = await createFundDisbursement(req.body, currentUser);

    success(res, fund, '创建资金拨付记录成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建资金拨付记录失败';
    error(res, message, 400);
  }
});

router.post('/:id/validate-fund', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      error(res, '无效的任务ID', 400);
      return;
    }

    await validateFundTaskMatch(taskId);

    success(res, null, '资金校验完成，未发现异常');
  } catch (err) {
    const message = err instanceof Error ? err.message : '资金校验失败';
    error(res, message, 400);
  }
});

router.post('/check-fund-abnormal', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const result = await checkFundAbnormalAndPush();

    success(res, result, '资金异常检查完成');
  } catch (err) {
    const message = err instanceof Error ? err.message : '资金异常检查失败';
    error(res, message, 500);
  }
});

export default router;
