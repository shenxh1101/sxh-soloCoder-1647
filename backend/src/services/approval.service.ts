import { Op, FindOptions, Transaction } from 'sequelize';
import {
  ApprovalWorkflow,
  ApprovalHistory,
  User,
  Region,
  Alert,
  GovernanceProject,
  sequelize,
} from '../models';
import { IApprovalWorkflowAttributes, IApprovalWorkflowCreationAttributes } from '../models/ApprovalWorkflow';
import { IApprovalHistoryCreationAttributes } from '../models/ApprovalHistory';
import {
  WorkflowType,
  WorkflowStage,
  WorkflowStatus,
  ApprovalResult,
  OperationType,
  UserRole,
  UserLevel,
  AlertStatus,
  ProjectStatus,
} from '../models/enums';
import { redis } from '../config';
import { pushApprovalMessage } from './messagePush.service';

export interface IApprovalQuery {
  page?: number;
  pageSize?: number;
  workflowType?: WorkflowType;
  workflowStatus?: WorkflowStatus;
  currentStage?: WorkflowStage;
  regionId?: number;
  applicantId?: number;
  relatedAlertId?: number;
  projectId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ICreateApprovalRequest {
  workflowType: WorkflowType;
  relatedAlertId?: number;
  projectId?: number;
  waterBodyId?: number;
  regionId: number;
  applicationContent: string;
  applicationReason: string;
  proposedScheme?: string;
  expectedEffect?: string;
  attachments?: object;
  stage1Handler?: number;
  stage2Handler?: number;
  stage3Handler?: number;
}

export interface IApprovalRequest {
  workflowId: number;
  opinion: string;
  result: ApprovalResult;
  attachments?: object;
}

const CACHE_PREFIX = 'approval:';
const CACHE_TTL = 1800;

const generateWorkflowCode = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `APR-${dateStr}-${random}`;
};

const getConfigThreshold = async (key: string, defaultValue: number): Promise<number> => {
  try {
    const cached = await redis.get(`config:${key}`);
    return cached ? parseFloat(cached) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const addApprovalHistory = async (
  workflowId: number,
  stage: number,
  operatorId: number,
  operationType: OperationType,
  opinion?: string,
  attachments?: object,
  transaction?: Transaction
): Promise<ApprovalHistory> => {
  const historyData: IApprovalHistoryCreationAttributes = {
    workflowId,
    stage,
    operatorId,
    operationType,
    opinion,
    attachments,
  };

  if (transaction) {
    return await ApprovalHistory.create(historyData, { transaction });
  }
  return await ApprovalHistory.create(historyData);
};

export const createApprovalWorkflow = async (
  request: ICreateApprovalRequest,
  currentUser: { userId: number; username: string; department?: string }
): Promise<IApprovalWorkflowAttributes> => {
  const transaction = await sequelize.transaction();

  try {
    const workflowCode = generateWorkflowCode();

    const workflowData: IApprovalWorkflowCreationAttributes = {
      workflowCode,
      workflowType: request.workflowType,
      relatedAlertId: request.relatedAlertId,
      projectId: request.projectId,
      waterBodyId: request.waterBodyId,
      regionId: request.regionId,
      applicantId: currentUser.userId,
      applicantUnit: currentUser.department,
      applicationContent: request.applicationContent,
      applicationReason: request.applicationReason,
      proposedScheme: request.proposedScheme,
      expectedEffect: request.expectedEffect,
      attachments: request.attachments,
      currentStage: WorkflowStage.STAGE_1_PENDING,
      workflowStatus: WorkflowStatus.IN_PROGRESS,
      stage1Handler: request.stage1Handler,
      stage2Handler: request.stage2Handler,
      stage3Handler: request.stage3Handler,
    };

    const workflow = await ApprovalWorkflow.create(workflowData, { transaction });

    await addApprovalHistory(
      workflow.workflowId,
      0,
      currentUser.userId,
      OperationType.SUBMIT,
      '发起审批申请',
      request.attachments,
      transaction
    );

    await transaction.commit();

    try {
      await pushApprovalMessage(workflow, 1);
    } catch (err) {
      console.error('Failed to push approval message:', err);
    }

    await clearApprovalCache();

    return workflow.toJSON();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

export const approveStage1 = async (
  request: IApprovalRequest,
  currentUser: { userId: number; username: string }
): Promise<IApprovalWorkflowAttributes | null> => {
  const workflow = await ApprovalWorkflow.findByPk(request.workflowId);
  if (!workflow) {
    return null;
  }

  if (workflow.currentStage !== WorkflowStage.STAGE_1_PENDING) {
    throw new Error('当前审批阶段不匹配');
  }

  if (workflow.workflowStatus !== WorkflowStatus.IN_PROGRESS) {
    throw new Error('审批流程已结束');
  }

  if (workflow.stage1Handler && workflow.stage1Handler !== currentUser.userId) {
    throw new Error('您不是该审批的处理人');
  }

  const transaction = await sequelize.transaction();

  try {
    const updateData: any = {
      stage1Opinion: request.opinion,
      stage1Result: request.result,
      stage1Time: new Date(),
    };

    if (request.result === ApprovalResult.APPROVED) {
      updateData.currentStage = WorkflowStage.STAGE_2_PENDING;
    } else {
      updateData.currentStage = WorkflowStage.REJECTED;
      updateData.workflowStatus = WorkflowStatus.REJECTED;
      updateData.finalResult = '一级审批驳回';
      updateData.finalTime = new Date();
    }

    await ApprovalWorkflow.update(updateData, {
      where: { workflowId: request.workflowId },
      transaction,
    });

    await addApprovalHistory(
      request.workflowId,
      1,
      currentUser.userId,
      request.result === ApprovalResult.APPROVED ? OperationType.APPROVE : OperationType.REJECT,
      request.opinion,
      request.attachments,
      transaction
    );

    await transaction.commit();

    if (request.result === ApprovalResult.APPROVED) {
      const updatedWorkflow = await ApprovalWorkflow.findByPk(request.workflowId);
      if (updatedWorkflow) {
        try {
          await pushApprovalMessage(updatedWorkflow, 2);
        } catch (err) {
          console.error('Failed to push approval message:', err);
        }
      }
    }

    await clearApprovalCache();

    const result = await ApprovalWorkflow.findByPk(request.workflowId);
    return result ? result.toJSON() : null;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

export const approveStage2 = async (
  request: IApprovalRequest,
  currentUser: { userId: number; username: string }
): Promise<IApprovalWorkflowAttributes | null> => {
  const workflow = await ApprovalWorkflow.findByPk(request.workflowId);
  if (!workflow) {
    return null;
  }

  if (workflow.currentStage !== WorkflowStage.STAGE_2_PENDING) {
    throw new Error('当前审批阶段不匹配');
  }

  if (workflow.workflowStatus !== WorkflowStatus.IN_PROGRESS) {
    throw new Error('审批流程已结束');
  }

  if (workflow.stage2Handler && workflow.stage2Handler !== currentUser.userId) {
    throw new Error('您不是该审批的处理人');
  }

  const transaction = await sequelize.transaction();

  try {
    const updateData: any = {
      stage2Opinion: request.opinion,
      stage2Result: request.result,
      stage2Time: new Date(),
    };

    if (request.result === ApprovalResult.APPROVED) {
      updateData.currentStage = WorkflowStage.STAGE_3_PENDING;
    } else {
      updateData.currentStage = WorkflowStage.REJECTED;
      updateData.workflowStatus = WorkflowStatus.REJECTED;
      updateData.finalResult = '二级审批驳回';
      updateData.finalTime = new Date();
    }

    await ApprovalWorkflow.update(updateData, {
      where: { workflowId: request.workflowId },
      transaction,
    });

    await addApprovalHistory(
      request.workflowId,
      2,
      currentUser.userId,
      request.result === ApprovalResult.APPROVED ? OperationType.APPROVE : OperationType.REJECT,
      request.opinion,
      request.attachments,
      transaction
    );

    await transaction.commit();

    if (request.result === ApprovalResult.APPROVED) {
      const updatedWorkflow = await ApprovalWorkflow.findByPk(request.workflowId);
      if (updatedWorkflow) {
        try {
          await pushApprovalMessage(updatedWorkflow, 3);
        } catch (err) {
          console.error('Failed to push approval message:', err);
        }
      }
    }

    await clearApprovalCache();

    const result = await ApprovalWorkflow.findByPk(request.workflowId);
    return result ? result.toJSON() : null;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

export const approveStage3 = async (
  request: IApprovalRequest,
  currentUser: { userId: number; username: string }
): Promise<IApprovalWorkflowAttributes | null> => {
  const workflow = await ApprovalWorkflow.findByPk(request.workflowId);
  if (!workflow) {
    return null;
  }

  if (workflow.currentStage !== WorkflowStage.STAGE_3_PENDING) {
    throw new Error('当前审批阶段不匹配');
  }

  if (workflow.workflowStatus !== WorkflowStatus.IN_PROGRESS) {
    throw new Error('审批流程已结束');
  }

  if (workflow.stage3Handler && workflow.stage3Handler !== currentUser.userId) {
    throw new Error('您不是该审批的处理人');
  }

  const transaction = await sequelize.transaction();

  try {
    const updateData: any = {
      stage3Opinion: request.opinion,
      stage3Result: request.result,
      stage3Time: new Date(),
    };

    if (request.result === ApprovalResult.APPROVED) {
      updateData.currentStage = WorkflowStage.COMPLETED;
      updateData.workflowStatus = WorkflowStatus.APPROVED;
      updateData.finalResult = '审批通过';
      updateData.finalTime = new Date();
    } else {
      updateData.currentStage = WorkflowStage.REJECTED;
      updateData.workflowStatus = WorkflowStatus.REJECTED;
      updateData.finalResult = '三级审批驳回';
      updateData.finalTime = new Date();
    }

    await ApprovalWorkflow.update(updateData, {
      where: { workflowId: request.workflowId },
      transaction,
    });

    await addApprovalHistory(
      request.workflowId,
      3,
      currentUser.userId,
      request.result === ApprovalResult.APPROVED ? OperationType.APPROVE : OperationType.REJECT,
      request.opinion,
      request.attachments,
      transaction
    );

    if (request.result === ApprovalResult.APPROVED && workflow.relatedAlertId) {
      await Alert.update(
        {
          alertStatus: AlertStatus.RESOLVED,
          relatedApprovalId: request.workflowId,
          handleMeasure: '已通过三级审批流程',
          handleResult: `审批编号${workflow.workflowCode}已通过：${updateData.finalResult}`,
          handleTime: new Date(),
          isApprovalNeeded: false,
        },
        { where: { alertId: workflow.relatedAlertId }, transaction }
      );
    }

    if (workflow.projectId && request.result === ApprovalResult.APPROVED) {
      await GovernanceProject.update(
        { projectStatus: ProjectStatus.UNDER_CONSTRUCTION },
        { where: { projectId: workflow.projectId, projectStatus: ProjectStatus.DELAYED }, transaction }
      );
    }

    await transaction.commit();

    await clearApprovalCache();

    const result = await ApprovalWorkflow.findByPk(request.workflowId);
    return result ? result.toJSON() : null;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

export const cancelApproval = async (
  workflowId: number,
  reason: string,
  currentUser: { userId: number; username: string }
): Promise<IApprovalWorkflowAttributes | null> => {
  const workflow = await ApprovalWorkflow.findByPk(workflowId);
  if (!workflow) {
    return null;
  }

  if (workflow.applicantId !== currentUser.userId) {
    throw new Error('只有申请人可以撤销审批');
  }

  if (workflow.workflowStatus !== WorkflowStatus.IN_PROGRESS) {
    throw new Error('审批流程已结束，无法撤销');
  }

  const transaction = await sequelize.transaction();

  try {
    await ApprovalWorkflow.update(
      {
        currentStage: WorkflowStage.REJECTED,
        workflowStatus: WorkflowStatus.CANCELLED,
        finalResult: `申请人撤销：${reason}`,
        finalTime: new Date(),
      },
      { where: { workflowId }, transaction }
    );

    await addApprovalHistory(
      workflowId,
      0,
      currentUser.userId,
      OperationType.CANCEL,
      reason,
      undefined,
      transaction
    );

    await transaction.commit();

    await clearApprovalCache();

    const result = await ApprovalWorkflow.findByPk(workflowId);
    return result ? result.toJSON() : null;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

export const getApprovalList = async (
  query: IApprovalQuery,
  currentUser?: { userId: number; role?: string; userLevel?: number }
): Promise<{ rows: IApprovalWorkflowAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    workflowType,
    workflowStatus,
    currentStage,
    regionId,
    applicantId,
    relatedAlertId,
    projectId,
    startDate,
    endDate,
  } = query;

  const where: any = {};

  if (workflowType !== undefined) where.workflowType = workflowType;
  if (workflowStatus !== undefined) where.workflowStatus = workflowStatus;
  if (currentStage !== undefined) where.currentStage = currentStage;
  if (regionId !== undefined) where.regionId = regionId;
  if (applicantId !== undefined) where.applicantId = applicantId;
  if (relatedAlertId !== undefined) where.relatedAlertId = relatedAlertId;
  if (projectId !== undefined) where.projectId = projectId;
  if (startDate && endDate) {
    where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  if (currentUser) {
    const pendingWhere: any[] = [];
    if (currentStage === WorkflowStage.STAGE_1_PENDING) {
      pendingWhere.push({ stage1Handler: currentUser.userId });
    } else if (currentStage === WorkflowStage.STAGE_2_PENDING) {
      pendingWhere.push({ stage2Handler: currentUser.userId });
    } else if (currentStage === WorkflowStage.STAGE_3_PENDING) {
      pendingWhere.push({ stage3Handler: currentUser.userId });
    }
    if (pendingWhere.length > 0) {
      where[Op.or] = pendingWhere;
    }
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['createdAt', 'DESC']],
    include: [
      { model: User, as: 'applicant', attributes: ['userId', 'username', 'realName'] },
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
      { model: Alert, as: 'alert', attributes: ['alertId', 'alertCode', 'alertContent'] },
    ],
  };

  const cacheKey = `${CACHE_PREFIX}list:${JSON.stringify(query)}:${currentUser?.userId || ''}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }

  const { rows, count } = await ApprovalWorkflow.findAndCountAll(options);

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ rows, count }));
  } catch (err) {
    console.error('Cache write error:', err);
  }

  return { rows: rows.map((r) => r.toJSON()), count };
};

export const getApprovalById = async (
  workflowId: number
): Promise<(IApprovalWorkflowAttributes & { history: any[] }) | null> => {
  const workflow = await ApprovalWorkflow.findByPk(workflowId, {
    include: [
      { model: User, as: 'applicant', attributes: ['userId', 'username', 'realName'] },
      { model: User, as: 'stage1HandlerUser', attributes: ['userId', 'username', 'realName'] },
      { model: User, as: 'stage2HandlerUser', attributes: ['userId', 'username', 'realName'] },
      { model: User, as: 'stage3HandlerUser', attributes: ['userId', 'username', 'realName'] },
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
      { model: Alert, as: 'alert', attributes: ['alertId', 'alertCode', 'alertContent'] },
    ],
  });

  if (!workflow) {
    return null;
  }

  const history = await ApprovalHistory.findAll({
    where: { workflowId },
    order: [['operationTime', 'ASC']],
    include: [
      { model: User, as: 'operator', attributes: ['userId', 'username', 'realName'] },
    ],
  });

  return {
    ...workflow.toJSON(),
    history: history.map((h) => h.toJSON()),
  };
};

export const getApprovalHistory = async (workflowId: number): Promise<any[]> => {
  const history = await ApprovalHistory.findAll({
    where: { workflowId },
    order: [['operationTime', 'ASC']],
    include: [
      { model: User, as: 'operator', attributes: ['userId', 'username', 'realName'] },
    ],
  });

  return history.map((h) => h.toJSON());
};

export const getPendingApprovalCount = async (
  userId: number,
  userRole?: string
): Promise<{ stage1: number; stage2: number; stage3: number; total: number }> => {
  const cacheKey = `${CACHE_PREFIX}pending:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }

  const stage1 = await ApprovalWorkflow.count({
    where: {
      currentStage: WorkflowStage.STAGE_1_PENDING,
      workflowStatus: WorkflowStatus.IN_PROGRESS,
      stage1Handler: userId,
    },
  });

  const stage2 = await ApprovalWorkflow.count({
    where: {
      currentStage: WorkflowStage.STAGE_2_PENDING,
      workflowStatus: WorkflowStatus.IN_PROGRESS,
      stage2Handler: userId,
    },
  });

  const stage3 = await ApprovalWorkflow.count({
    where: {
      currentStage: WorkflowStage.STAGE_3_PENDING,
      workflowStatus: WorkflowStatus.IN_PROGRESS,
      stage3Handler: userId,
    },
  });

  const result = { stage1, stage2, stage3, total: stage1 + stage2 + stage3 };

  try {
    await redis.setex(cacheKey, 300, JSON.stringify(result));
  } catch (err) {
    console.error('Cache write error:', err);
  }

  return result;
};

export const checkApprovalTimeout = async (): Promise<{ remindedCount: number; overdueCount: number }> => {
  const stage1Days = await getConfigThreshold('approval:stage1_timeout_days', 3);
  const stage2Days = await getConfigThreshold('approval:stage2_timeout_days', 5);
  const stage3Days = await getConfigThreshold('approval:stage3_timeout_days', 7);
  const now = new Date();

  const pendingWorkflows = await ApprovalWorkflow.findAll({
    where: {
      workflowStatus: WorkflowStatus.IN_PROGRESS,
      currentStage: { [Op.in]: [WorkflowStage.STAGE_1_PENDING, WorkflowStage.STAGE_2_PENDING, WorkflowStage.STAGE_3_PENDING] },
    },
  });

  let remindedCount = 0;
  let overdueCount = 0;

  for (const workflow of pendingWorkflows) {
    try {
      const timeoutDays = workflow.currentStage === WorkflowStage.STAGE_1_PENDING
        ? stage1Days
        : workflow.currentStage === WorkflowStage.STAGE_2_PENDING
        ? stage2Days
        : stage3Days;

      const lastUpdate = workflow.updatedAt || workflow.createdAt;
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceUpdate >= timeoutDays) {
        overdueCount++;
      }

      if (daysSinceUpdate >= timeoutDays - 1 && workflow.currentStage) {
        await pushApprovalMessage(workflow, workflow.currentStage);
        remindedCount++;
      }
    } catch (err) {
      console.error('Failed to push timeout reminder:', err);
    }
  }

  return { remindedCount, overdueCount };
};

const clearApprovalCache = async (): Promise<void> => {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error('Cache clear error:', err);
  }
};

export default {
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
};
