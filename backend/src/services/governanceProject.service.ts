import { Op, FindOptions, literal, fn, col } from 'sequelize';
import { GovernanceProject, IGovernanceProjectAttributes, IGovernanceProjectCreationAttributes } from '../models/GovernanceProject';
import { WaterBody } from '../models/WaterBody';
import { Region } from '../models/Region';
import { OperationLog } from '../models/OperationLog';
import { IUserAttributes } from '../models/User';
import { ProjectType, ProjectStatus } from '../models/enums';
import { applyDataPermissionFilter } from './permission.service';

export interface IGovernanceProjectQuery {
  page?: number;
  pageSize?: number;
  projectCode?: string;
  projectName?: string;
  waterBodyId?: number;
  regionId?: number;
  projectType?: ProjectType;
  projectStatus?: ProjectStatus;
  isKeyProject?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface IProjectStatsQuery {
  regionId?: number;
  waterBodyId?: number;
  projectType?: ProjectType;
}

const calculateProgress = (startDate: Date, endDate: Date, actualStart?: Date | null): number => {
  const now = new Date();
  const totalDuration = endDate.getTime() - startDate.getTime();

  if (totalDuration <= 0) return 100;

  const effectiveStart = actualStart || startDate;
  const elapsedDuration = now.getTime() - effectiveStart.getTime();

  if (elapsedDuration <= 0) return 0;
  if (elapsedDuration >= totalDuration) return 100;

  return Math.round((elapsedDuration / totalDuration) * 10000) / 100;
};

const calculateProgressDeviation = (plannedProgress: number, actualProgress: number): number => {
  return Math.round((plannedProgress - actualProgress) * 100) / 100;
};

const autoDetectProjectStatus = (
  plannedProgress: number,
  actualProgress: number,
  progressDeviation: number,
  plannedEndDate?: Date | null
): ProjectStatus => {
  if (actualProgress >= 100) {
    return ProjectStatus.COMPLETED;
  }

  if (plannedEndDate && new Date() > plannedEndDate && actualProgress < 100) {
    return ProjectStatus.DELAYED;
  }

  if (progressDeviation > 10) {
    return ProjectStatus.DELAYED;
  }

  if (actualProgress > 0) {
    return ProjectStatus.UNDER_CONSTRUCTION;
  }

  return ProjectStatus.NOT_STARTED;
};

export const getGovernanceProjectList = async (
  query: IGovernanceProjectQuery,
  currentUser: IUserAttributes
): Promise<{ rows: IGovernanceProjectAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    projectCode,
    projectName,
    waterBodyId,
    regionId,
    projectType,
    projectStatus,
    isKeyProject,
    startTime,
    endTime,
  } = query;

  const where: any = {};

  if (projectCode) {
    where.projectCode = { [Op.like]: `%${projectCode}%` };
  }
  if (projectName) {
    where.projectName = { [Op.like]: `%${projectName}%` };
  }
  if (waterBodyId) {
    where.waterBodyId = waterBodyId;
  }
  if (projectType !== undefined) {
    where.projectType = projectType;
  }
  if (projectStatus !== undefined) {
    where.projectStatus = projectStatus;
  }
  if (isKeyProject !== undefined) {
    where.isKeyProject = isKeyProject;
  }
  if (startTime) {
    where.plannedStartDate = { [Op.gte]: new Date(startTime) };
  }
  if (endTime) {
    where.plannedEndDate = { [Op.lte]: new Date(endTime) };
  }

  const include: any[] = [
    {
      model: WaterBody,
      as: 'waterBody',
      attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName'],
      include: [
        {
          model: Region,
          as: 'region',
          attributes: ['regionId', 'regionName', 'regionCode'],
        },
      ],
    },
  ];

  if (regionId) {
    (include[0].include[0] as any).where = { regionId };
  }

  const options: FindOptions = {
    where,
    include,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['createdAt', 'DESC']],
  };

  const { rows, count } = await GovernanceProject.findAndCountAll(options);

  return {
    rows: rows.map(r => r.toJSON()),
    count,
  };
};

export const getGovernanceProjectById = async (
  projectId: number,
  currentUser: IUserAttributes
): Promise<IGovernanceProjectAttributes | null> => {
  const options: FindOptions = {
    where: { projectId },
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName'],
        include: [
          {
            model: Region,
            as: 'region',
            attributes: ['regionId', 'regionName', 'regionCode'],
          },
        ],
      },
    ],
  };

  const project = await GovernanceProject.findOne(options);
  return project ? project.toJSON() : null;
};

export const createGovernanceProject = async (
  data: IGovernanceProjectCreationAttributes,
  currentUser: IUserAttributes
): Promise<IGovernanceProjectAttributes> => {
  const waterBody = await WaterBody.findByPk(data.waterBodyId);
  if (!waterBody) {
    throw new Error('水体不存在');
  }

  const existingProject = await GovernanceProject.findOne({ where: { projectCode: data.projectCode } });
  if (existingProject) {
    throw new Error('项目编号已存在');
  }

  if (data.plannedStartDate && data.plannedEndDate) {
    const plannedProgress = calculateProgress(
      new Date(data.plannedStartDate),
      new Date(data.plannedEndDate),
      data.actualStartDate ? new Date(data.actualStartDate) : null
    );
    data.plannedProgress = plannedProgress;

    if (data.actualProgress !== undefined) {
      data.progressDeviation = calculateProgressDeviation(plannedProgress, data.actualProgress);
      data.projectStatus = autoDetectProjectStatus(
        plannedProgress,
        data.actualProgress,
        data.progressDeviation,
        data.plannedEndDate ? new Date(data.plannedEndDate) : null
      );
    }
  }

  const created = await GovernanceProject.create(data);

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_governance_project',
    'governance_project',
    `创建治理项目: ${data.projectName}`,
    { projectId: created.projectId, projectCode: data.projectCode }
  );

  return created.toJSON();
};

export const updateGovernanceProject = async (
  projectId: number,
  data: Partial<IGovernanceProjectAttributes>,
  currentUser: IUserAttributes
): Promise<IGovernanceProjectAttributes | null> => {
  const existing = await GovernanceProject.findByPk(projectId);
  if (!existing) {
    return null;
  }

  if (data.waterBodyId !== undefined && data.waterBodyId !== existing.waterBodyId) {
    const waterBody = await WaterBody.findByPk(data.waterBodyId);
    if (!waterBody) {
      throw new Error('水体不存在');
    }
  }

  if (data.projectCode && data.projectCode !== existing.projectCode) {
    const existingProject = await GovernanceProject.findOne({ where: { projectCode: data.projectCode } });
    if (existingProject) {
      throw new Error('项目编号已存在');
    }
  }

  const startDate = data.plannedStartDate ? new Date(data.plannedStartDate) : (existing.plannedStartDate ? new Date(existing.plannedStartDate) : null);
  const endDate = data.plannedEndDate ? new Date(data.plannedEndDate) : (existing.plannedEndDate ? new Date(existing.plannedEndDate) : null);

  if (startDate && endDate) {
    const actualStart = data.actualStartDate ? new Date(data.actualStartDate) : (existing.actualStartDate ? new Date(existing.actualStartDate) : null);
    const plannedProgress = calculateProgress(startDate, endDate, actualStart);
    data.plannedProgress = plannedProgress;

    const actualProgress = data.actualProgress !== undefined ? data.actualProgress : existing.actualProgress || 0;
    data.progressDeviation = calculateProgressDeviation(plannedProgress, actualProgress);
    data.projectStatus = autoDetectProjectStatus(
      plannedProgress,
      actualProgress,
      data.progressDeviation,
      endDate
    );
  }

  await GovernanceProject.update(data, { where: { projectId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_governance_project',
    'governance_project',
    `更新治理项目: ${existing.projectName}`,
    { projectId, ...data }
  );

  const updated = await GovernanceProject.findByPk(projectId);
  return updated ? updated.toJSON() : null;
};

export const deleteGovernanceProject = async (
  projectId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const existing = await GovernanceProject.findByPk(projectId);
  if (!existing) {
    return false;
  }

  await GovernanceProject.destroy({ where: { projectId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_governance_project',
    'governance_project',
    `删除治理项目: ${existing.projectName}`,
    { projectId, projectCode: existing.projectCode }
  );

  return true;
};

export const updateProjectProgress = async (
  projectId: number,
  actualProgress: number,
  currentUser: IUserAttributes
): Promise<IGovernanceProjectAttributes | null> => {
  const existing = await GovernanceProject.findByPk(projectId);
  if (!existing) {
    return null;
  }

  if (actualProgress < 0 || actualProgress > 100) {
    throw new Error('进度值应在0-100之间');
  }

  const startDate = existing.plannedStartDate ? new Date(existing.plannedStartDate) : new Date();
  const endDate = existing.plannedEndDate ? new Date(existing.plannedEndDate) : new Date();
  const actualStart = existing.actualStartDate ? new Date(existing.actualStartDate) : null;

  const plannedProgress = calculateProgress(startDate, endDate, actualStart);
  const progressDeviation = calculateProgressDeviation(plannedProgress, actualProgress);
  const projectStatus = autoDetectProjectStatus(plannedProgress, actualProgress, progressDeviation, endDate);

  await GovernanceProject.update(
    {
      actualProgress,
      plannedProgress,
      progressDeviation,
      projectStatus,
    },
    { where: { projectId } }
  );

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_project_progress',
    'governance_project',
    `更新项目进度: ${existing.projectName} - ${actualProgress}%`,
    { projectId, actualProgress, plannedProgress, progressDeviation }
  );

  const updated = await GovernanceProject.findByPk(projectId);
  return updated ? updated.toJSON() : null;
};

export const updateProjectStatus = async (
  projectId: number,
  newStatus: ProjectStatus,
  currentUser: IUserAttributes
): Promise<IGovernanceProjectAttributes | null> => {
  const existing = await GovernanceProject.findByPk(projectId);
  if (!existing) {
    return null;
  }

  const updateData: Partial<IGovernanceProjectAttributes> = { projectStatus: newStatus };

  if (newStatus === ProjectStatus.COMPLETED || newStatus === ProjectStatus.ACCEPTED) {
    updateData.actualEndDate = new Date();
    updateData.actualProgress = 100;
  }

  if (newStatus === ProjectStatus.UNDER_CONSTRUCTION && !existing.actualStartDate) {
    updateData.actualStartDate = new Date();
  }

  await GovernanceProject.update(updateData, { where: { projectId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_project_status',
    'governance_project',
    `更新项目状态: ${existing.projectName} - ${newStatus}`,
    { projectId, oldStatus: existing.projectStatus, newStatus }
  );

  const updated = await GovernanceProject.findByPk(projectId);
  return updated ? updated.toJSON() : null;
};

export const getProjectStatistics = async (
  query: IProjectStatsQuery,
  currentUser: IUserAttributes
): Promise<any> => {
  const { regionId, waterBodyId, projectType } = query;

  const where: any = {};
  const include: any[] = [
    {
      model: WaterBody,
      as: 'waterBody',
      attributes: [],
      include: [
        {
          model: Region,
          as: 'region',
          attributes: [],
        },
      ],
    },
  ];

  if (waterBodyId) {
    where.waterBodyId = waterBodyId;
  }
  if (regionId) {
    (include[0].include[0] as any).where = { regionId };
  }
  if (projectType !== undefined) {
    where.projectType = projectType;
  }

  const totalCount = await GovernanceProject.count({ where, include });
  const completedCount = await GovernanceProject.count({ where: { ...where, projectStatus: ProjectStatus.COMPLETED }, include });
  const underConstructionCount = await GovernanceProject.count({ where: { ...where, projectStatus: ProjectStatus.UNDER_CONSTRUCTION }, include });
  const delayedCount = await GovernanceProject.count({ where: { ...where, projectStatus: ProjectStatus.DELAYED }, include });
  const notStartedCount = await GovernanceProject.count({ where: { ...where, projectStatus: ProjectStatus.NOT_STARTED }, include });

  const avgProgressResult = await GovernanceProject.findOne({
    where,
    include,
    attributes: [[fn('AVG', col('actual_progress')), 'avgProgress']],
    raw: true,
  });

  const totalInvestmentResult = await GovernanceProject.findOne({
    where,
    include,
    attributes: [
      [fn('SUM', col('planned_investment')), 'totalPlannedInvestment'],
      [fn('SUM', col('actual_payment')), 'totalActualPayment'],
    ],
    raw: true,
  });

  return {
    totalCount,
    completedCount,
    underConstructionCount,
    delayedCount,
    notStartedCount,
    completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 10000) / 100 : 0,
    avgProgress: avgProgressResult ? parseFloat((avgProgressResult as any).avgProgress || 0) : 0,
    totalPlannedInvestment: totalInvestmentResult ? parseFloat((totalInvestmentResult as any).totalPlannedInvestment || 0) : 0,
    totalActualPayment: totalInvestmentResult ? parseFloat((totalInvestmentResult as any).totalActualPayment || 0) : 0,
  };
};

const recordOperationLog = async (
  userId: number,
  username: string,
  operationType: string,
  moduleName: string,
  operationContent: string,
  requestParams?: object
): Promise<void> => {
  try {
    await OperationLog.create({
      userId,
      username,
      operationType,
      moduleName,
      operationContent,
      requestParams,
    });
  } catch (err) {
    console.error('Failed to record operation log:', err);
  }
};

export default {
  getGovernanceProjectList,
  getGovernanceProjectById,
  createGovernanceProject,
  updateGovernanceProject,
  deleteGovernanceProject,
  updateProjectProgress,
  updateProjectStatus,
  getProjectStatistics,
};
