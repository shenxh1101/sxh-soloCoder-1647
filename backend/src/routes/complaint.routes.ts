import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/permissions';
import { UserRole, ComplaintType, ComplaintSource, OrderStatus, Priority } from '../models/enums';
import {
  getComplaintList,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  acceptComplaint,
  processComplaint,
  followUpComplaint,
  closeComplaint,
  getComplaintStatistics,
  IComplaintQuery,
  IComplaintStatsQuery,
} from '../services/complaint.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';

const router = Router();

const createSchema = Joi.object({
  complaintCode: Joi.string().max(50),
  complaintSource: Joi.number().valid(
    ComplaintSource.PHONE,
    ComplaintSource.WECHAT,
    ComplaintSource.WEBSITE,
    ComplaintSource.APP,
    ComplaintSource.LETTER,
    ComplaintSource.ON_SITE
  ).required(),
  complaintType: Joi.number().valid(
    ComplaintType.BLACK_ODOROUS,
    ComplaintType.SEWAGE_DISCHARGE,
    ComplaintType.FLOATING_GARBAGE,
    ComplaintType.VEGETATION_DAMAGE,
    ComplaintType.FACILITY_DAMAGE,
    ComplaintType.OTHER
  ).required(),
  waterBodyId: Joi.number().allow(null),
  regionId: Joi.number().allow(null),
  complaintTime: Joi.date().required(),
  complainant: Joi.string().max(50).allow(null, ''),
  contactPhone: Joi.string().max(20).allow(null, ''),
  complaintContent: Joi.string().required(),
  location: Joi.object().allow(null),
  address: Joi.string().max(500).allow(null, ''),
  priority: Joi.number().valid(Priority.URGENT, Priority.NORMAL, Priority.LOW),
  hotKeywords: Joi.array().items(Joi.string()).allow(null),
  attachments: Joi.array().items(Joi.string()).allow(null),
  remarks: Joi.string().allow(null, ''),
});

const updateSchema = Joi.object({
  complaintCode: Joi.string().max(50),
  complaintSource: Joi.number().valid(
    ComplaintSource.PHONE,
    ComplaintSource.WECHAT,
    ComplaintSource.WEBSITE,
    ComplaintSource.APP,
    ComplaintSource.LETTER,
    ComplaintSource.ON_SITE
  ),
  complaintType: Joi.number().valid(
    ComplaintType.BLACK_ODOROUS,
    ComplaintType.SEWAGE_DISCHARGE,
    ComplaintType.FLOATING_GARBAGE,
    ComplaintType.VEGETATION_DAMAGE,
    ComplaintType.FACILITY_DAMAGE,
    ComplaintType.OTHER
  ),
  waterBodyId: Joi.number().allow(null),
  regionId: Joi.number().allow(null),
  complaintTime: Joi.date(),
  complainant: Joi.string().max(50).allow(null, ''),
  contactPhone: Joi.string().max(20).allow(null, ''),
  complaintContent: Joi.string(),
  location: Joi.object().allow(null),
  address: Joi.string().max(500).allow(null, ''),
  priority: Joi.number().valid(Priority.URGENT, Priority.NORMAL, Priority.LOW),
  hotKeywords: Joi.array().items(Joi.string()).allow(null),
  attachments: Joi.array().items(Joi.string()).allow(null),
  remarks: Joi.string().allow(null, ''),
});

const acceptSchema = Joi.object({
  handlerUnit: Joi.string().required().max(200),
  handlerPerson: Joi.string().required().max(50),
  deadline: Joi.date().required(),
});

const processSchema = Joi.object({
  processResult: Joi.string().required(),
});

const followUpSchema = Joi.object({
  satisfactionScore: Joi.number().min(1).max(5).required(),
  satisfactionFeedback: Joi.string().allow(null, ''),
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

    const query: IComplaintQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      complaintCode: req.query.complaintCode as string,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      complaintType: req.query.complaintType ? parseInt(req.query.complaintType as string) as ComplaintType : undefined,
      orderStatus: req.query.orderStatus ? parseInt(req.query.orderStatus as string) as OrderStatus : undefined,
      priority: req.query.priority ? parseInt(req.query.priority as string) as Priority : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
      handlerPerson: req.query.handlerPerson as string,
    };

    const { rows, count } = await getComplaintList(query, currentUser);
    paginate(res, rows, query.page!, query.pageSize!, count, '获取投诉工单列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取投诉工单列表失败';
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

    const query: IComplaintStatsQuery = {
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
      groupBy: req.query.groupBy as 'complaintType' | 'orderStatus' | 'region' | 'month',
    };

    const data = await getComplaintStatistics(query, currentUser);
    success(res, data, '获取投诉统计成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取投诉统计失败';
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

    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      error(res, '无效的工单ID', 400);
      return;
    }

    const data = await getComplaintById(complaintId, currentUser);
    if (!data) {
      error(res, '投诉工单不存在', 404);
      return;
    }

    success(res, data, '获取投诉工单详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取投诉工单详情失败';
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

    const data = await createComplaint(req.body, currentUser);
    success(res, data, '创建投诉工单成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建投诉工单失败';
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

    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      error(res, '无效的工单ID', 400);
      return;
    }

    const { error: validationError } = updateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateComplaint(complaintId, req.body, currentUser);
    if (!data) {
      error(res, '投诉工单不存在', 404);
      return;
    }

    success(res, data, '更新投诉工单成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新投诉工单失败';
    error(res, message, 400);
  }
});

router.put('/:id/accept', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      error(res, '无效的工单ID', 400);
      return;
    }

    const { error: validationError } = acceptSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await acceptComplaint(
      complaintId,
      req.body.handlerUnit,
      req.body.handlerPerson,
      req.body.deadline,
      currentUser
    );
    if (!data) {
      error(res, '投诉工单不存在', 404);
      return;
    }

    success(res, data, '受理投诉工单成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '受理投诉工单失败';
    error(res, message, 400);
  }
});

router.put('/:id/process', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      error(res, '无效的工单ID', 400);
      return;
    }

    const { error: validationError } = processSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await processComplaint(complaintId, req.body.processResult, currentUser);
    if (!data) {
      error(res, '投诉工单不存在', 404);
      return;
    }

    success(res, data, '处理投诉工单成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '处理投诉工单失败';
    error(res, message, 400);
  }
});

router.put('/:id/follow-up', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      error(res, '无效的工单ID', 400);
      return;
    }

    const { error: validationError } = followUpSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await followUpComplaint(
      complaintId,
      req.body.satisfactionScore,
      req.body.satisfactionFeedback,
      currentUser
    );
    if (!data) {
      error(res, '投诉工单不存在', 404);
      return;
    }

    success(res, data, '回访投诉工单成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '回访投诉工单失败';
    error(res, message, 400);
  }
});

router.put('/:id/close', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      error(res, '无效的工单ID', 400);
      return;
    }

    const data = await closeComplaint(complaintId, currentUser);
    if (!data) {
      error(res, '投诉工单不存在', 404);
      return;
    }

    success(res, data, '结案投诉工单成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '结案投诉工单失败';
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

    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      error(res, '无效的工单ID', 400);
      return;
    }

    const result = await deleteComplaint(complaintId, currentUser);
    if (!result) {
      error(res, '投诉工单不存在', 404);
      return;
    }

    success(res, null, '删除投诉工单成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除投诉工单失败';
    error(res, message, 400);
  }
});

export default router;
