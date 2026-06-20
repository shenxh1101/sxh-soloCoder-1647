import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/permissions';
import { UserRole, ProjectType, ProjectStatus } from '../models/enums';
import {
  getGovernanceProjectList,
  getGovernanceProjectById,
  createGovernanceProject,
  updateGovernanceProject,
  deleteGovernanceProject,
  updateProjectProgress,
  updateProjectStatus,
  getProjectStatistics,
  IGovernanceProjectQuery,
} from '../services/governanceProject.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';

const router = Router();

const createSchema = Joi.object({
  projectCode: Joi.string().required().max(50),
  projectName: Joi.string().required().max(200),
  projectType: Joi.number().valid(
    ProjectType.SEWAGE_INTERCEPTION,
    ProjectType.DREDGING,
    ProjectType.ECOLOGICAL_RESTORATION,
    ProjectType.WATER_CIRCULATION,
    ProjectType.NON_POINT_SOURCE_TREATMENT,
    ProjectType.OTHER
  ).required(),
  waterBodyId: Joi.number().required(),
  projectDescription: Joi.string().allow(null, ''),
  isKeyProject: Joi.boolean().default(false),
  plannedStartDate: Joi.date().required(),
  plannedEndDate: Joi.date().required(),
  actualStartDate: Joi.date().allow(null),
  actualEndDate: Joi.date().allow(null),
  plannedInvestment: Joi.number().min(0).allow(null),
  actualPayment: Joi.number().min(0).allow(null),
  actualProgress: Joi.number().min(0).max(100).default(0),
  projectStatus: Joi.number().valid(
    ProjectStatus.NOT_STARTED,
    ProjectStatus.UNDER_CONSTRUCTION,
    ProjectStatus.COMPLETED,
    ProjectStatus.ACCEPTED,
    ProjectStatus.DELAYED
  ),
  constructionContent: Joi.string().allow(null, ''),
  responsibleUnit: Joi.string().max(200).allow(null, ''),
  responsiblePerson: Joi.string().max(50).allow(null, ''),
  responsiblePhone: Joi.string().max(20).allow(null, ''),
  supervisionUnit: Joi.string().max(200).allow(null, ''),
  supervisionPerson: Joi.string().max(50).allow(null, ''),
  constructionUnit: Joi.string().max(200).allow(null, ''),
  designUnit: Joi.string().max(200).allow(null, ''),
  remarks: Joi.string().allow(null, ''),
});

const updateSchema = Joi.object({
  projectCode: Joi.string().max(50),
  projectName: Joi.string().max(200),
  projectType: Joi.number().valid(
    ProjectType.SEWAGE_INTERCEPTION,
    ProjectType.DREDGING,
    ProjectType.ECOLOGICAL_RESTORATION,
    ProjectType.WATER_CIRCULATION,
    ProjectType.NON_POINT_SOURCE_TREATMENT,
    ProjectType.OTHER
  ),
  waterBodyId: Joi.number(),
  projectDescription: Joi.string().allow(null, ''),
  isKeyProject: Joi.boolean(),
  plannedStartDate: Joi.date(),
  plannedEndDate: Joi.date(),
  actualStartDate: Joi.date().allow(null),
  actualEndDate: Joi.date().allow(null),
  plannedInvestment: Joi.number().min(0).allow(null),
  actualPayment: Joi.number().min(0).allow(null),
  actualProgress: Joi.number().min(0).max(100),
  projectStatus: Joi.number().valid(
    ProjectStatus.NOT_STARTED,
    ProjectStatus.UNDER_CONSTRUCTION,
    ProjectStatus.COMPLETED,
    ProjectStatus.ACCEPTED,
    ProjectStatus.DELAYED
  ),
  constructionContent: Joi.string().allow(null, ''),
  responsibleUnit: Joi.string().max(200).allow(null, ''),
  responsiblePerson: Joi.string().max(50).allow(null, ''),
  responsiblePhone: Joi.string().max(20).allow(null, ''),
  supervisionUnit: Joi.string().max(200).allow(null, ''),
  supervisionPerson: Joi.string().max(50).allow(null, ''),
  constructionUnit: Joi.string().max(200).allow(null, ''),
  designUnit: Joi.string().max(200).allow(null, ''),
  remarks: Joi.string().allow(null, ''),
});

const updateProgressSchema = Joi.object({
  actualProgress: Joi.number().min(0).max(100).required(),
});

const updateStatusSchema = Joi.object({
  projectStatus: Joi.number().valid(
    ProjectStatus.NOT_STARTED,
    ProjectStatus.UNDER_CONSTRUCTION,
    ProjectStatus.COMPLETED,
    ProjectStatus.ACCEPTED,
    ProjectStatus.DELAYED
  ).required(),
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

    const query: IGovernanceProjectQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      projectCode: req.query.projectCode as string,
      projectName: req.query.projectName as string,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      projectType: req.query.projectType ? parseInt(req.query.projectType as string) as ProjectType : undefined,
      projectStatus: req.query.projectStatus ? parseInt(req.query.projectStatus as string) as ProjectStatus : undefined,
      isKeyProject: req.query.isKeyProject !== undefined ? req.query.isKeyProject === 'true' : undefined,
      startTime: req.query.startTime as string,
      endTime: req.query.endTime as string,
    };

    const { rows, count } = await getGovernanceProjectList(query, currentUser);
    paginate(res, rows, query.page!, query.pageSize!, count, '获取治理项目列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取治理项目列表失败';
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

    const query = {
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      waterBodyId: req.query.waterBodyId ? parseInt(req.query.waterBodyId as string) : undefined,
      projectType: req.query.projectType ? parseInt(req.query.projectType as string) as ProjectType : undefined,
    };

    const data = await getProjectStatistics(query, currentUser);
    success(res, data, '获取项目统计成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取项目统计失败';
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

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      error(res, '无效的项目ID', 400);
      return;
    }

    const data = await getGovernanceProjectById(projectId, currentUser);
    if (!data) {
      error(res, '治理项目不存在', 404);
      return;
    }

    success(res, data, '获取治理项目详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取治理项目详情失败';
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

    const data = await createGovernanceProject(req.body, currentUser);
    success(res, data, '创建治理项目成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建治理项目失败';
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

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      error(res, '无效的项目ID', 400);
      return;
    }

    const { error: validationError } = updateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateGovernanceProject(projectId, req.body, currentUser);
    if (!data) {
      error(res, '治理项目不存在', 404);
      return;
    }

    success(res, data, '更新治理项目成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新治理项目失败';
    error(res, message, 400);
  }
});

router.put('/:id/progress', authenticate, requireRole(UserRole.ADMIN, UserRole.APPROVER), async (req: Request, res: Response): Promise<void> => {
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

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      error(res, '无效的项目ID', 400);
      return;
    }

    const { error: validationError } = updateProgressSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateProjectProgress(projectId, req.body.actualProgress, currentUser);
    if (!data) {
      error(res, '治理项目不存在', 404);
      return;
    }

    success(res, data, '更新项目进度成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新项目进度失败';
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

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      error(res, '无效的项目ID', 400);
      return;
    }

    const { error: validationError } = updateStatusSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const data = await updateProjectStatus(projectId, req.body.projectStatus, currentUser);
    if (!data) {
      error(res, '治理项目不存在', 404);
      return;
    }

    success(res, data, '更新项目状态成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新项目状态失败';
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

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      error(res, '无效的项目ID', 400);
      return;
    }

    const result = await deleteGovernanceProject(projectId, currentUser);
    if (!result) {
      error(res, '治理项目不存在', 404);
      return;
    }

    success(res, null, '删除治理项目成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除治理项目失败';
    error(res, message, 400);
  }
});

export default router;
