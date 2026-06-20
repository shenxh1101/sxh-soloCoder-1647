import { Op, FindOptions, Transaction } from 'sequelize';
import * as XLSX from 'xlsx';
import {
  AnnualTask,
  FundDisbursement,
  Region,
  WaterBody,
  User,
  GovernanceProject,
  sequelize,
} from '../models';
import { IAnnualTaskAttributes, IAnnualTaskCreationAttributes } from '../models/AnnualTask';
import { IFundDisbursementAttributes, IFundDisbursementCreationAttributes } from '../models/FundDisbursement';
import {
  TaskType,
  TaskStatus,
  FundMatchStatus,
  FundType,
  PaymentStatus,
  UserRole,
} from '../models/enums';
import { redis } from '../config';
import { pushMessage } from './messagePush.service';
import { MessageType, PushChannel, ReceiverType } from '../models/enums';

export interface ITaskQuery {
  page?: number;
  pageSize?: number;
  year?: number;
  regionId?: number;
  waterBodyId?: number;
  taskType?: TaskType;
  taskStatus?: TaskStatus;
  isBudgetAbnormal?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface IFundQuery {
  page?: number;
  pageSize?: number;
  taskId?: number;
  projectId?: number;
  fundType?: FundType;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}

export interface IImportResult {
  successCount: number;
  failCount: number;
  errors: string[];
  tasks: IAnnualTaskAttributes[];
}

const CACHE_PREFIX = 'task:';
const CACHE_TTL = 1800;

const generateTaskCode = (year: number): string => {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TASK-${year}-${random}`;
};

const getConfigThreshold = async (key: string, defaultValue: number): Promise<number> => {
  try {
    const cached = await redis.get(`config:${key}`);
    return cached ? parseFloat(cached) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const parseExcelFile = async (filePath: string): Promise<any[]> => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
};

export const importAnnualTasks = async (
  excelData: any[],
  year: number,
  currentUser: { userId: number; username: string }
): Promise<IImportResult> => {
  const result: IImportResult = {
    successCount: 0,
    failCount: 0,
    errors: [],
    tasks: [],
  };

  const transaction = await sequelize.transaction();

  try {
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const rowNum = i + 2;

      try {
        if (!row.任务内容 || !row.区域编码) {
          throw new Error(`第${rowNum}行：缺少必要字段`);
        }

        const region = await Region.findOne({
          where: { regionCode: String(row.区域编码) },
          transaction,
        });
        if (!region) {
          throw new Error(`第${rowNum}行：区域编码【${row.区域编码}】不存在`);
        }

        let waterBodyId: number | undefined;
        if (row.水体编码) {
          const waterBody = await WaterBody.findOne({
            where: { waterBodyCode: String(row.水体编码) },
            transaction,
          });
          if (!waterBody) {
            throw new Error(`第${rowNum}行：水体编码【${row.水体编码}】不存在`);
          }
          waterBodyId = waterBody.waterBodyId;
        }

        const taskType = mapTaskType(row.任务类型);
        const plannedStartDate = row.计划开始日期 ? new Date(row.计划开始日期) : undefined;
        const plannedEndDate = row.计划完成日期 ? new Date(row.计划完成日期) : undefined;

        if (plannedStartDate && plannedEndDate && plannedStartDate > plannedEndDate) {
          throw new Error(`第${rowNum}行：计划开始日期不能晚于计划完成日期`);
        }

        const plannedBudget = row.计划预算 ? parseFloat(row.计划预算) : undefined;
        const allocatedFunds = row.已拨付资金 ? parseFloat(row.已拨付资金) : 0;
        const actualExpenditure = row.实际支出 ? parseFloat(row.实际支出) : 0;

        const budgetDeviation = plannedBudget
          ? Math.round(((actualExpenditure - plannedBudget) / plannedBudget) * 10000) / 100
          : 0;

        const deviationThreshold = await getConfigThreshold('alert:fund_deviation_threshold', 15);
        const isBudgetAbnormal = Math.abs(budgetDeviation) > deviationThreshold;

        const taskData: IAnnualTaskCreationAttributes = {
          taskCode: generateTaskCode(year),
          year,
          regionId: region.regionId,
          waterBodyId,
          taskType,
          taskContent: row.任务内容,
          targetIndicator: row.目标指标 ? JSON.parse(row.目标指标) : undefined,
          plannedStartDate,
          plannedEndDate,
          plannedBudget,
          allocatedFunds,
          actualExpenditure,
          budgetDeviation,
          taskStatus: mapTaskStatus(row.任务状态),
          completionRate: row.完成率 ? parseFloat(row.完成率) : 0,
          fundMatchStatus: FundMatchStatus.MATCHED,
          isBudgetAbnormal,
          abnormalReminder: isBudgetAbnormal ? `预算偏差${budgetDeviation}%，超过阈值${deviationThreshold}%` : undefined,
          uploadUserId: currentUser.userId,
          uploadTime: new Date(),
        };

        const task = await AnnualTask.create(taskData, { transaction });
        result.tasks.push(task.toJSON());
        result.successCount++;
      } catch (err) {
        result.failCount++;
        result.errors.push(err instanceof Error ? err.message : `第${rowNum}行：导入失败`);
      }
    }

    await transaction.commit();

    if (result.failCount > 0) {
      console.warn(`导入完成，成功${result.successCount}条，失败${result.failCount}条`);
    }

    for (const task of result.tasks) {
      try {
        const completionRate = task.completionRate || 0;
        const plannedBudget = task.plannedBudget || 0;
        const allocatedFunds = task.allocatedFunds || 0;

        if (task.plannedEndDate && plannedBudget > 0) {
          const expectedFundByProgress = plannedBudget * (completionRate / 100);
          const fundDeviationFromProgress = expectedFundByProgress > 0
            ? Math.round(((allocatedFunds - expectedFundByProgress) / expectedFundByProgress) * 10000) / 100
            : 0;

          if (Math.abs(fundDeviationFromProgress) > 30) {
            await AnnualTask.update(
              {
                isBudgetAbnormal: true,
                abnormalReminder: [
                  task.abnormalReminder,
                  `进度${completionRate}%对应预期拨付${expectedFundByProgress.toFixed(2)}元，实际拨付${allocatedFunds.toFixed(2)}元，偏差${fundDeviationFromProgress}%`,
                ].filter(Boolean).join('；'),
              },
              { where: { taskId: task.taskId } },
            );
          }

          await validateFundTaskMatch(task.taskId);
        }
      } catch (err) {
        console.error(`导入后校验任务${task.taskId}资金节奏失败:`, err);
      }
    }

    await checkFundAbnormalAndPush();
    await clearTaskCache();

    return result;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const mapTaskType = (type: string): TaskType => {
  const typeMap: Record<string, TaskType> = {
    '水体消除': TaskType.WATER_BODY_ELIMINATION,
    '工程建设': TaskType.PROJECT_CONSTRUCTION,
    '水质提升': TaskType.WATER_QUALITY_IMPROVEMENT,
    '生态修复': TaskType.ECOLOGICAL_RESTORATION,
  };
  return typeMap[type] || TaskType.WATER_QUALITY_IMPROVEMENT;
};

const mapTaskStatus = (status: string): TaskStatus => {
  const statusMap: Record<string, TaskStatus> = {
    '未开始': TaskStatus.NOT_STARTED,
    '进行中': TaskStatus.IN_PROGRESS,
    '已完成': TaskStatus.COMPLETED,
    '延期': TaskStatus.DELAYED,
  };
  return statusMap[status] || TaskStatus.NOT_STARTED;
};

export const getTaskList = async (
  query: ITaskQuery
): Promise<{ rows: IAnnualTaskAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    year,
    regionId,
    waterBodyId,
    taskType,
    taskStatus,
    isBudgetAbnormal,
    startDate,
    endDate,
  } = query;

  const where: any = {};

  if (year !== undefined) where.year = year;
  if (regionId !== undefined) where.regionId = regionId;
  if (waterBodyId !== undefined) where.waterBodyId = waterBodyId;
  if (taskType !== undefined) where.taskType = taskType;
  if (taskStatus !== undefined) where.taskStatus = taskStatus;
  if (isBudgetAbnormal !== undefined) where.isBudgetAbnormal = isBudgetAbnormal;
  if (startDate && endDate) {
    where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['createdAt', 'DESC']],
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
      { model: WaterBody, as: 'waterBody', attributes: ['waterBodyId', 'waterBodyName'] },
      { model: User, as: 'uploader', attributes: ['userId', 'username', 'realName'] },
    ],
  };

  const cacheKey = `${CACHE_PREFIX}list:${JSON.stringify(query)}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }

  const { rows, count } = await AnnualTask.findAndCountAll(options);

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ rows, count }));
  } catch (err) {
    console.error('Cache write error:', err);
  }

  return { rows: rows.map((r) => r.toJSON()), count };
};

export const getTaskById = async (taskId: number): Promise<(IAnnualTaskAttributes & { fundDisbursements: any[] }) | null> => {
  const task = await AnnualTask.findByPk(taskId, {
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
      { model: WaterBody, as: 'waterBody', attributes: ['waterBodyId', 'waterBodyName'] },
      { model: User, as: 'uploader', attributes: ['userId', 'username', 'realName'] },
    ],
  });

  if (!task) {
    return null;
  }

  const fundDisbursements = await FundDisbursement.findAll({
    where: { taskId },
    order: [['disbursementDate', 'DESC']],
    include: [
      { model: User, as: 'operator', attributes: ['userId', 'username', 'realName'] },
    ],
  });

  return {
    ...task.toJSON(),
    fundDisbursements: fundDisbursements.map((f) => f.toJSON()),
  };
};

export const createTask = async (
  taskData: Omit<IAnnualTaskCreationAttributes, 'taskCode' | 'uploadUserId' | 'uploadTime'>,
  currentUser: { userId: number; username: string }
): Promise<IAnnualTaskAttributes> => {
  const taskCode = generateTaskCode(taskData.year);

  const deviationThreshold = await getConfigThreshold('alert:fund_deviation_threshold', 15);
  const budgetDeviation = taskData.plannedBudget
    ? Math.round(((taskData.actualExpenditure || 0) - taskData.plannedBudget) / taskData.plannedBudget * 10000) / 100
    : 0;
  const isBudgetAbnormal = Math.abs(budgetDeviation) > deviationThreshold;

  const createData: IAnnualTaskCreationAttributes = {
    ...taskData,
    taskCode,
    budgetDeviation,
    isBudgetAbnormal,
    uploadUserId: currentUser.userId,
    uploadTime: new Date(),
  };
  if (isBudgetAbnormal) {
    createData.abnormalReminder = `预算偏差${budgetDeviation}%，超过阈值${deviationThreshold}%`;
  }
  const createdTask = await AnnualTask.create(createData);

  await clearTaskCache();

  return createdTask.toJSON();
};

export const updateTask = async (
  taskId: number,
  taskData: Partial<IAnnualTaskAttributes>,
  currentUser: { userId: number; username: string }
): Promise<IAnnualTaskAttributes | null> => {
  const task = await AnnualTask.findByPk(taskId);
  if (!task) {
    return null;
  }

  const updateData: any = { ...taskData };

  if (taskData.plannedBudget !== undefined || taskData.actualExpenditure !== undefined) {
    const plannedBudget = taskData.plannedBudget !== undefined ? taskData.plannedBudget : task.plannedBudget;
    const actualExpenditure = taskData.actualExpenditure !== undefined ? taskData.actualExpenditure : task.actualExpenditure;

    const deviationThreshold = await getConfigThreshold('alert:fund_deviation_threshold', 15);
    const budgetDeviation = plannedBudget
      ? Math.round(((actualExpenditure || 0) - plannedBudget) / plannedBudget * 10000) / 100
      : 0;
    const isBudgetAbnormal = Math.abs(budgetDeviation) > deviationThreshold;

    updateData.budgetDeviation = budgetDeviation;
    updateData.isBudgetAbnormal = isBudgetAbnormal;
    updateData.abnormalReminder = isBudgetAbnormal ? `预算偏差${budgetDeviation}%，超过阈值${deviationThreshold}%` : undefined;
  }

  await AnnualTask.update(updateData, { where: { taskId } });

  await clearTaskCache();

  try {
    const timingIssues = await validateFundTaskMatch(taskId);
    if (timingIssues.length > 0) {
      const refreshedTask = await AnnualTask.findByPk(taskId);
      if (refreshedTask?.isBudgetAbnormal && !task.isBudgetAbnormal) {
        await checkFundAbnormalAndPush();
      }
    }
  } catch (err) {
    console.error(`更新后校验任务${taskId}资金节奏失败:`, err);
  }

  if (updateData.isBudgetAbnormal && !task.isBudgetAbnormal) {
    await checkFundAbnormalAndPush();
  }

  const updatedTask = await AnnualTask.findByPk(taskId);
  return updatedTask ? updatedTask.toJSON() : null;
};

export const deleteTask = async (taskId: number): Promise<boolean> => {
  const task = await AnnualTask.findByPk(taskId);
  if (!task) {
    return false;
  }

  const transaction = await sequelize.transaction();

  try {
    await FundDisbursement.destroy({ where: { taskId }, transaction });
    await AnnualTask.destroy({ where: { taskId }, transaction });
    await transaction.commit();
    await clearTaskCache();
    return true;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

export const createFundDisbursement = async (
  fundData: Omit<IFundDisbursementCreationAttributes, 'operatorId'>,
  currentUser: { userId: number; username: string }
): Promise<IFundDisbursementAttributes> => {
  const createFundData: IFundDisbursementCreationAttributes = {
    ...fundData,
    operatorId: currentUser.userId,
  };
  const createdFund = await FundDisbursement.create(createFundData);

  if (fundData.taskId) {
    const task = await AnnualTask.findByPk(fundData.taskId);
    if (task) {
      const totalDisbursed = await FundDisbursement.sum('amount', {
        where: { taskId: fundData.taskId, paymentStatus: PaymentStatus.PAID },
      });
      await task.update({ allocatedFunds: totalDisbursed || 0 });
      await validateFundTaskMatch(fundData.taskId);
    }
  }

  await clearTaskCache();

  return createdFund.toJSON();
};

export const getFundList = async (
  query: IFundQuery
): Promise<{ rows: IFundDisbursementAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    taskId,
    projectId,
    fundType,
    paymentStatus,
    startDate,
    endDate,
  } = query;

  const where: any = {};

  if (taskId !== undefined) where.taskId = taskId;
  if (projectId !== undefined) where.projectId = projectId;
  if (fundType !== undefined) where.fundType = fundType;
  if (paymentStatus !== undefined) where.paymentStatus = paymentStatus;
  if (startDate && endDate) {
    where.disbursementDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['disbursementDate', 'DESC']],
    include: [
      { model: AnnualTask, as: 'annualTask', attributes: ['taskId', 'taskCode', 'taskContent'] },
      { model: GovernanceProject, as: 'project', attributes: ['projectId', 'projectCode', 'projectName'] },
      { model: User, as: 'operator', attributes: ['userId', 'username', 'realName'] },
    ],
  };

  const { rows, count } = await FundDisbursement.findAndCountAll(options);

  return { rows: rows.map((r) => r.toJSON()), count };
};

const pushFundTimingAlert = async (task: AnnualTask, issues: string[]): Promise<void> => {
  const financeUsers = await User.findAll({
    where: { department: '财务科', isActive: true },
    attributes: ['userId'],
  });
  if (financeUsers.length === 0) return;

  const region = await Region.findByPk(task.regionId);
  const content = issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n');

  await pushMessage({
    messageType: MessageType.NOTIFICATION,
    title: `资金拨付节奏异常提醒 - ${region?.regionName || '未知区域'}`,
    content: `年度任务【${task.taskContent}】存在以下资金节奏异常：\n${content}\n\n请及时核实并调整资金拨付计划。`,
    channels: [PushChannel.APP, PushChannel.SMS, PushChannel.EMAIL],
    receiverType: ReceiverType.USER,
    receiverIds: financeUsers.map((u) => u.userId),
    relatedId: task.taskId,
  });
};

export const validateFundTaskMatch = async (taskId: number): Promise<string[]> => {
  const task = await AnnualTask.findByPk(taskId);
  if (!task || !task.plannedEndDate) return [];

  const totalDisbursed = await FundDisbursement.sum('amount', {
    where: { taskId, paymentStatus: PaymentStatus.PAID },
  });

  const now = new Date();
  const plannedEndDate = task.plannedEndDate;
  const totalDays = plannedEndDate.getTime() - (task.plannedStartDate?.getTime() || now.getTime());
  const elapsedDays = now.getTime() - (task.plannedStartDate?.getTime() || now.getTime());
  const expectedProgress = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 100;
  const expectedDisbursement = (task.plannedBudget || 0) * (expectedProgress / 100);

  const deviation = totalDisbursed && expectedDisbursement > 0
    ? Math.round(((totalDisbursed - expectedDisbursement) / expectedDisbursement) * 10000) / 100
    : 0;

  let fundMatchStatus = FundMatchStatus.MATCHED;
  if (Math.abs(deviation) > 20) {
    fundMatchStatus = FundMatchStatus.UNMATCHED;
  } else if (Math.abs(deviation) > 10) {
    fundMatchStatus = FundMatchStatus.BASICALLY_MATCHED;
  }

  const completionRate = task.completionRate || 0;
  const fundRate = task.plannedBudget ? (totalDisbursed / task.plannedBudget) * 100 : 0;
  const daysRemaining = Math.ceil((plannedEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const issues: string[] = [];

  if (now > plannedEndDate && fundRate < 80) {
    issues.push(`任务已过计划完成时间，但资金拨付率仅为${fundRate.toFixed(1)}%，低于80%阈值`);
  }

  if (completionRate > 60 && fundRate < 40) {
    issues.push(`任务进度达${completionRate}%但资金拨付率仅${fundRate.toFixed(1)}%，资金拨付严重滞后`);
  }

  if (fundRate > 90 && expectedProgress < 50 && completionRate < 30) {
    issues.push(`资金前半段已拨付${fundRate.toFixed(1)}%，但进度仅${completionRate}%，资金使用效率低`);
  }

  if (daysRemaining > 0 && daysRemaining <= 30 && fundRate < 60) {
    issues.push(`距计划完成日期仅剩${daysRemaining}天，但资金拨付率仅${fundRate.toFixed(1)}%，需加速拨付`);
  }

  if (issues.length > 0) {
    fundMatchStatus = FundMatchStatus.UNMATCHED;
  } else if (fundMatchStatus === FundMatchStatus.MATCHED && Math.abs(deviation) > 10) {
    fundMatchStatus = FundMatchStatus.BASICALLY_MATCHED;
  }

  const isBudgetAbnormal = issues.length > 0 || Math.abs(deviation) > 20;
  const existingReminder = task.abnormalReminder || '';
  const timingReminder = issues.length > 0 ? issues.join('；') : '';
  const abnormalReminder = [existingReminder, timingReminder].filter(Boolean).join('；') || undefined;

  await task.update({ fundMatchStatus, isBudgetAbnormal, abnormalReminder });

  if (issues.length > 0) {
    await pushFundTimingAlert(task, issues);
  }

  return issues;
};

export const checkFundAbnormalAndPush = async (): Promise<{ abnormalCount: number; pushedCount: number }> => {
  const deviationThreshold = await getConfigThreshold('alert:fund_deviation_threshold', 15);

  const abnormalTasks = await AnnualTask.findAll({
    where: {
      isBudgetAbnormal: true,
    },
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
    ],
  });

  const financeUsers = await User.findAll({
    where: {
      department: '财务科',
      isActive: true,
    },
    attributes: ['userId'],
  });

  let pushedCount = 0;

  if (abnormalTasks.length > 0 && financeUsers.length > 0) {
    const content = abnormalTasks
      .map((task) => `【${task.region?.regionName}】${task.taskContent}，预算偏差${task.budgetDeviation}%`)
      .join('\n');

    try {
      await pushMessage({
        messageType: MessageType.NOTIFICATION,
        title: '资金异常提醒',
        content: `检测到${abnormalTasks.length}条资金异常记录：\n${content}`,
        channels: [PushChannel.APP, PushChannel.SMS],
        receiverType: ReceiverType.USER,
        receiverIds: financeUsers.map((u) => u.userId),
        relatedId: abnormalTasks[0].taskId,
      });
      pushedCount += financeUsers.length;
    } catch (err) {
      console.error('Failed to push fund abnormal alert:', err);
    }
  }

  const inProgressTasks = await AnnualTask.findAll({
    where: { taskStatus: TaskStatus.IN_PROGRESS },
  });

  for (const task of inProgressTasks) {
    try {
      const issues = await validateFundTaskMatch(task.taskId);
      if (issues.length > 0 && financeUsers.length > 0) {
        pushedCount += financeUsers.length;
      }
    } catch (err) {
      console.error(`Failed to validate fund timing for task ${task.taskId}:`, err);
    }
  }

  const totalAbnormal = abnormalTasks.length + inProgressTasks.filter((t) => t.isBudgetAbnormal).length;
  return { abnormalCount: totalAbnormal, pushedCount };
};

export const getTaskStatistics = async (
  year?: number,
  regionId?: number
): Promise<{
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  delayed: number;
  totalBudget: number;
  totalAllocated: number;
  totalActual: number;
  abnormalCount: number;
  byType: Record<number, number>;
}> => {
  const where: any = {};
  if (year !== undefined) where.year = year;
  if (regionId !== undefined) where.regionId = regionId;

  const total = await AnnualTask.count({ where });
  const notStarted = await AnnualTask.count({ where: { ...where, taskStatus: TaskStatus.NOT_STARTED } });
  const inProgress = await AnnualTask.count({ where: { ...where, taskStatus: TaskStatus.IN_PROGRESS } });
  const completed = await AnnualTask.count({ where: { ...where, taskStatus: TaskStatus.COMPLETED } });
  const delayed = await AnnualTask.count({ where: { ...where, taskStatus: TaskStatus.DELAYED } });

  const tasks = await AnnualTask.findAll({ where });
  const totalBudget = tasks.reduce((sum, t) => sum + (t.plannedBudget || 0), 0);
  const totalAllocated = tasks.reduce((sum, t) => sum + (t.allocatedFunds || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (t.actualExpenditure || 0), 0);
  const abnormalCount = tasks.filter((t) => t.isBudgetAbnormal).length;

  const byType: Record<number, number> = {};
  for (const type of Object.values(TaskType).filter((v) => typeof v === 'number')) {
    byType[type as number] = await AnnualTask.count({ where: { ...where, taskType: type as TaskType } });
  }

  return { total, notStarted, inProgress, completed, delayed, totalBudget, totalAllocated, totalActual, abnormalCount, byType };
};

const clearTaskCache = async (): Promise<void> => {
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
  parseExcelFile,
  importAnnualTasks,
  getTaskList,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  createFundDisbursement,
  getFundList,
  validateFundTaskMatch,
  checkFundAbnormalAndPush,
  getTaskStatistics,
};
