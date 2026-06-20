import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/permissions';
import { UserRole, AssessmentType, AssessmentLevel } from '../models/enums';
import {
  getAssessmentList,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  approveAssessment,
  getAssessmentComparison,
  IAssessmentQuery,
  IAssessmentCompareQuery,
} from '../services/assessment.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';

const router = Router();

const createSchema = Joi.object({
  assessmentCode: Joi.string().max(50),
  waterBodyId: Joi.number().required(),
  assessmentType: Joi.number().valid(
    AssessmentType.QUARTERLY,
    AssessmentType.ANNUAL,
    AssessmentType.FINAL_ACCEPTANCE,
    AssessmentType.SPECIAL
  ).required(),
  assessmentDate: Joi.date().required(),
  assessmentPeriod: Joi.string().max(50).allow(null, ''),
  waterQualityScore: Joi.number().min(0).max(100).required(),
  ecologicalIndex: Joi.number().min(0).max(100).required(),
  landscapeScore: Joi.number().min(0).max(100).required(),
  managementScore: Joi.number().min(0).max(100).required(),
  biodiversityIndex: Joi.number().min(0).max(100).allow(null),
  vegetationCoverage: Joi.number().min(0).max(100).allow(null),
  habitatQuality: Joi.number().min(0).max(100).allow(null),
  assessmentOpinion: Joi.string().allow(null, ''),
  problemDescription: Joi.string().allow(null, ''),
  improvementSuggestions: Joi.string().allow(null, ''),
  attachments: Joi.array().items(Joi.string()).allow(null),
  remarks: Joi.string().allow(null, ''),
});

const updateSchema = Joi.object({
  assessmentCode: Joi.string().max(50),
  waterBodyId: Joi.number(),
  assessmentType: Joi.number().valid(
    AssessmentType.QUARTERLY,
    AssessmentType.ANNUAL,
    AssessmentType.FINAL_ACCEPTANCE,
    AssessmentType.SPECIAL
  ),
  assessmentDate: Joi.date(),
  assessmentPeriod: Joi.string().max(50).allow(null, ''),
  waterQualityScore: Joi.number().min(0).max(100),
  ecologicalIndex: Joi.number().min(0).max(100),
  landscapeScore: Joi.number().min(0).max(100),
  managementScore: Joi.number().min(0).max(100),
  biodiversityIndex: Joi.number().min(0).max(100).allow(null),
  vegetationCoverage: Joi.number().min(0).max(100).allow(null),
  habitatQuality: Joi.number().min(0).max(100).allow(null),
  assessmentOpinion: Joi.string().allow(null, ''),
  problemDescription: Joi.string().allow(null, ''),
  improvementSuggestions: Joi.string().allow(null, ''),
  attachments: Joi.array().items(Joi.string()).allow(null),
  remarks: Joi.string().allow(null, ''),
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

    const query: IAssessmentQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      assessmentCode: req.query.assessmentCode as string,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      assessmentType: req.query.assessmentType ? parseInt(req.query.assessmentType as string) as AssessmentType : undefined,
      assessmentLevel: req.query.assessmentLevel as AssessmentLevel,
      isApproved: req.query.isApproved !== undefined ? req.query.isApproved === 'true' : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
    };

    const { rows, count } = await getAssessmentList(query, currentUser);
    paginate(res, rows, query.page!, query.pageSize!, count, '获取生态评估列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取生态评估列表失败';
    error(res, message, 500);
  }
});

router.get('/comparison', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    const waterBodyId = req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined;
    const startTime = req.query.startTime as string;
    const endTime = req.query.endTime as string;
    const assessmentType = req.query.assessmentType ? parseInt(req.query.assessmentType as string) as AssessmentType : undefined;

    if (!waterBodyId || !startTime || !endTime) {
      error(res, '缺少必要参数：waterBodyId、startTime、endTime', 400);
      return;
    }

    const query: IAssessmentCompareQuery = { waterBodyId, startTime, endTime, assessmentType };
    const data = await getAssessmentComparison(query, currentUser);
    success(res, data, '获取历史评估对比成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取历史评估对比失败';
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

    const assessmentId = parseInt(req.params.id);
    if (isNaN(assessmentId)) {
      error(res, '无效的评估ID', 400);
      return;
    }

    const data = await getAssessmentById(assessmentId, currentUser);
    if (!data) {
      error(res, '生态评估不存在', 404);
      return;
    }

    success(res, data, '获取生态评估详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取生态评估详情失败';
    error(res, message, 500);
  }
});

router.post('/', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER, UserRole.AUDITOR), async (req: Request, res: Response): Promise<void> => {
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

    const data = await createAssessment(req.body, currentUser);
    success(res, data, '创建生态评估成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建生态评估失败';
    error(res, message, 400);
  }
});

router.put('/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER, UserRole.AUDITOR), async (req: Request, res: Response): Promise<void> => {
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

    const assessmentId = parseInt(req.params.id);
    if (isNaN(assessmentId)) {
      error(res, '无效的评估ID', 400);
      return;
    }

    const { error: validationError } = updateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateAssessment(assessmentId, req.body, currentUser);
    if (!data) {
      error(res, '生态评估不存在', 404);
      return;
    }

    success(res, data, '更新生态评估成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新生态评估失败';
    error(res, message, 400);
  }
});

router.put('/:id/approve', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const assessmentId = parseInt(req.params.id);
    if (isNaN(assessmentId)) {
      error(res, '无效的评估ID', 400);
      return;
    }

    const data = await approveAssessment(assessmentId, currentUser);
    if (!data) {
      error(res, '生态评估不存在', 404);
      return;
    }

    success(res, data, '审核通过生态评估成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '审核生态评估失败';
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

    const assessmentId = parseInt(req.params.id);
    if (isNaN(assessmentId)) {
      error(res, '无效的评估ID', 400);
      return;
    }

    const result = await deleteAssessment(assessmentId, currentUser);
    if (!result) {
      error(res, '生态评估不存在', 404);
      return;
    }

    success(res, null, '删除生态评估成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除生态评估失败';
    error(res, message, 400);
  }
});

export default router;
