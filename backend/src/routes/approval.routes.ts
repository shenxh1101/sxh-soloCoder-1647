import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import {
  createApprovalWorkflow,
  approveStage1,
  approveStage2,
  approveStage3,
  cancelApproval,
  getApprovalList,
  getApprovalById,
  getApprovalHistory,
  getPendingApprovalCount,
  checkApprovalTimeout,
  IApprovalQuery,
  ICreateApprovalRequest,
  IApprovalRequest,
} from '../services/approval.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';
import { WorkflowType, WorkflowStatus, WorkflowStage, ApprovalResult } from '../models/enums';

const router = Router();

const createApprovalSchema = Joi.object({
  workflowType: Joi.number().valid(
    WorkflowType.GOVERNANCE_PLAN_ADJUSTMENT,
    WorkflowType.EMERGENCY_SEWAGE_INTERCEPTION,
    WorkflowType.PROJECT_DELAY,
    WorkflowType.FUND_ADJUSTMENT
  ).required(),
  relatedAlertId: Joi.number(),
  projectId: Joi.number(),
  waterBodyId: Joi.number(),
  regionId: Joi.number().required(),
  applicationContent: Joi.string().required().min(1).max(2000),
  applicationReason: Joi.string().required().min(1).max(2000),
  proposedScheme: Joi.string().max(2000),
  expectedEffect: Joi.string().max(2000),
  attachments: Joi.object(),
  stage1Handler: Joi.number(),
  stage2Handler: Joi.number(),
  stage3Handler: Joi.number(),
});

const approvalSchema = Joi.object({
  opinion: Joi.string().required().min(1).max(2000),
  result: Joi.number().valid(ApprovalResult.APPROVED, ApprovalResult.REJECTED).required(),
  attachments: Joi.object(),
});

const cancelApprovalSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
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

    const query: IApprovalQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      workflowType: req.query.workflowType ? (req.query.workflowType as unknown as WorkflowType) : undefined,
      workflowStatus: req.query.workflowStatus ? (req.query.workflowStatus as unknown as WorkflowStatus) : undefined,
      currentStage: req.query.currentStage ? (req.query.currentStage as unknown as WorkflowStage) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      applicantId: req.query.applicantId ? parseInt(req.query.applicantId as string) : undefined,
      relatedAlertId: req.query.relatedAlertId ? parseInt(req.query.relatedAlertId as string) : undefined,
      projectId: req.query.projectId ? parseInt(req.query.projectId as string) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      tab: req.query.tab as 'pending' | 'initiated' | 'all' | undefined,
    };

    const { rows, count } = await getApprovalList(query, currentUser);

    paginate(res, rows, query.page!, query.pageSize!, count, '获取审批列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取审批列表失败';
    error(res, message, 500);
  }
});

router.get('/pending/count', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const count = await getPendingApprovalCount(currentUser.userId, currentUser.role, currentUser.userLevel);

    success(res, { count }, '获取待审批数量成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取待审批数量失败';
    error(res, message, 500);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      error(res, '无效的审批ID', 400);
      return;
    }

    const workflow = await getApprovalById(workflowId);
    if (!workflow) {
      error(res, '审批不存在', 404);
      return;
    }

    success(res, workflow, '获取审批详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取审批详情失败';
    error(res, message, 500);
  }
});

router.get('/:id/history', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      error(res, '无效的审批ID', 400);
      return;
    }

    const history = await getApprovalHistory(workflowId);

    success(res, history, '获取审批历史成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取审批历史失败';
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

    const { error: validationError } = createApprovalSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const request: ICreateApprovalRequest = req.body;
    const workflow = await createApprovalWorkflow(request, currentUser);

    success(res, workflow, '创建审批流程成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建审批流程失败';
    error(res, message, 400);
  }
});

router.put('/:id/approve/stage1', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      error(res, '无效的审批ID', 400);
      return;
    }

    const { error: validationError } = approvalSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const request: IApprovalRequest = {
      workflowId,
      ...req.body,
    };

    const workflow = await approveStage1(request, currentUser);
    if (!workflow) {
      error(res, '审批不存在或状态不允许', 404);
      return;
    }

    success(res, workflow, '一级审批完成');
  } catch (err) {
    const message = err instanceof Error ? err.message : '一级审批失败';
    error(res, message, 400);
  }
});

router.put('/:id/approve/stage2', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      error(res, '无效的审批ID', 400);
      return;
    }

    const { error: validationError } = approvalSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const request: IApprovalRequest = {
      workflowId,
      ...req.body,
    };

    const workflow = await approveStage2(request, currentUser);
    if (!workflow) {
      error(res, '审批不存在或状态不允许', 404);
      return;
    }

    success(res, workflow, '二级审批完成');
  } catch (err) {
    const message = err instanceof Error ? err.message : '二级审批失败';
    error(res, message, 400);
  }
});

router.put('/:id/approve/stage3', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      error(res, '无效的审批ID', 400);
      return;
    }

    const { error: validationError } = approvalSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const request: IApprovalRequest = {
      workflowId,
      ...req.body,
    };

    const workflow = await approveStage3(request, currentUser);
    if (!workflow) {
      error(res, '审批不存在或状态不允许', 404);
      return;
    }

    success(res, workflow, '三级审批完成');
  } catch (err) {
    const message = err instanceof Error ? err.message : '三级审批失败';
    error(res, message, 400);
  }
});

router.put('/:id/cancel', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      error(res, '无效的审批ID', 400);
      return;
    }

    const { error: validationError } = cancelApprovalSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const workflow = await cancelApproval(workflowId, req.body.reason, currentUser);
    if (!workflow) {
      error(res, '审批不存在或状态不允许', 404);
      return;
    }

    success(res, workflow, '撤销审批成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '撤销审批失败';
    error(res, message, 400);
  }
});

router.post('/check-timeout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const result = await checkApprovalTimeout();

    success(res, result, '审批超时检查完成');
  } catch (err) {
    const message = err instanceof Error ? err.message : '审批超时检查失败';
    error(res, message, 500);
  }
});

export default router;
