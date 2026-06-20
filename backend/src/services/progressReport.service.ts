import { Op, FindOptions, fn, col, literal } from 'sequelize';
import { ProjectProgressReport, IProjectProgressReportAttributes, IProjectProgressReportCreationAttributes } from '../models/ProjectProgressReport';
import { GovernanceProject } from '../models/GovernanceProject';
import { WaterBody } from '../models/WaterBody';
import { Region } from '../models/Region';
import { User } from '../models/User';
import { OperationLog } from '../models/OperationLog';
import { IUserAttributes } from '../models/User';
import { ReportStatus } from '../models/enums';

export interface IProgressReportQuery {
  page?: number;
  pageSize?: number;
  projectId?: number;
  waterBodyId?: number;
  regionId?: number;
  reportPeriod?: string;
  reportStatus?: ReportStatus;
  startTime?: string;
  endTime?: string;
}

export interface IProgressTrendQuery {
  projectId: number;
  startTime: string;
  endTime: string;
}

export const getProgressReportList = async (
  query: IProgressReportQuery,
  currentUser: IUserAttributes
): Promise<{ rows: IProjectProgressReportAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    projectId,
    waterBodyId,
    regionId,
    reportPeriod,
    reportStatus,
    startTime,
    endTime,
  } = query;

  const where: any = {};

  if (projectId) {
    where.projectId = projectId;
  }
  if (reportPeriod) {
    where.reportPeriod = reportPeriod;
  }
  if (reportStatus !== undefined) {
    where.reportStatus = reportStatus;
  }
  if (startTime) {
    where.reportDate = { [Op.gte]: new Date(startTime) };
  }
  if (endTime) {
    where.reportDate = { ...where.reportDate, [Op.lte]: new Date(endTime) };
  }

  const include: any[] = [
    {
      model: GovernanceProject,
      as: 'project',
      attributes: ['projectId', 'projectCode', 'projectName', 'projectStatus', 'actualProgress'],
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
    },
    {
      model: User,
      as: 'submitter',
      attributes: ['userId', 'username', 'realName'],
    },
    {
      model: User,
      as: 'reviewer',
      attributes: ['userId', 'username', 'realName'],
    },
  ];

  if (waterBodyId) {
    (include[0].include[0] as any).where = { waterBodyId };
  }
  if (regionId) {
    (include[0].include[0].include[0] as any).where = { regionId };
  }

  const options: FindOptions = {
    where,
    include,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['reportDate', 'DESC']],
  };

  const { rows, count } = await ProjectProgressReport.findAndCountAll(options);

  return {
    rows: rows.map(r => r.toJSON()),
    count,
  };
};

export const getProgressReportById = async (
  reportId: number,
  currentUser: IUserAttributes
): Promise<IProjectProgressReportAttributes | null> => {
  const options: FindOptions = {
    where: { reportId },
    include: [
      {
        model: GovernanceProject,
        as: 'project',
        attributes: ['projectId', 'projectCode', 'projectName', 'projectStatus', 'actualProgress'],
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
      },
      {
        model: User,
        as: 'submitter',
        attributes: ['userId', 'username', 'realName'],
      },
      {
        model: User,
        as: 'reviewer',
        attributes: ['userId', 'username', 'realName'],
      },
    ],
  };

  const report = await ProjectProgressReport.findOne(options);
  return report ? report.toJSON() : null;
};

const calculateProgressDeviation = (
  data: Partial<IProjectProgressReportAttributes>
): void => {
  if (data.monthlyPlannedProgress !== undefined && data.monthlyActualProgress !== undefined) {
    data.monthlyPlannedProgress = Math.round(data.monthlyPlannedProgress * 100) / 100;
    data.monthlyActualProgress = Math.round(data.monthlyActualProgress * 100) / 100;
  }

  if (data.cumulativePlannedProgress !== undefined && data.cumulativeActualProgress !== undefined) {
    data.cumulativePlannedProgress = Math.round(data.cumulativePlannedProgress * 100) / 100;
    data.cumulativeActualProgress = Math.round(data.cumulativeActualProgress * 100) / 100;
  }
};

export const createProgressReport = async (
  data: IProjectProgressReportCreationAttributes,
  currentUser: IUserAttributes
): Promise<IProjectProgressReportAttributes> => {
  const project = await GovernanceProject.findByPk(data.projectId);
  if (!project) {
    throw new Error('项目不存在');
  }

  const existingReport = await ProjectProgressReport.findOne({
    where: {
      projectId: data.projectId,
      reportPeriod: data.reportPeriod,
    },
  });
  if (existingReport) {
    throw new Error('该项目此月份报告已存在');
  }

  calculateProgressDeviation(data);
  data.reportStatus = ReportStatus.DRAFT;

  const created = await ProjectProgressReport.create(data);

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_progress_report',
    'progress_report',
    `创建进度月报: ${data.reportPeriod} - 项目${data.projectId}`,
    { reportId: created.reportId, projectId: data.projectId, reportPeriod: data.reportPeriod }
  );

  return created.toJSON();
};

export const updateProgressReport = async (
  reportId: number,
  data: Partial<IProjectProgressReportAttributes>,
  currentUser: IUserAttributes
): Promise<IProjectProgressReportAttributes | null> => {
  const existing = await ProjectProgressReport.findByPk(reportId);
  if (!existing) {
    return null;
  }

  if (existing.reportStatus === ReportStatus.REVIEWED) {
    throw new Error('已审核的报告无法修改');
  }

  if (data.projectId !== undefined && data.projectId !== existing.projectId) {
    const project = await GovernanceProject.findByPk(data.projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
  }

  if (data.reportPeriod && data.reportPeriod !== existing.reportPeriod && data.projectId) {
    const existingReport = await ProjectProgressReport.findOne({
      where: {
        projectId: data.projectId,
        reportPeriod: data.reportPeriod,
        reportId: { [Op.ne]: reportId },
      },
    });
    if (existingReport) {
      throw new Error('该项目此月份报告已存在');
    }
  }

  calculateProgressDeviation(data);

  await ProjectProgressReport.update(data, { where: { reportId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_progress_report',
    'progress_report',
    `更新进度月报: ${reportId}`,
    { reportId, ...data }
  );

  const updated = await ProjectProgressReport.findByPk(reportId);
  return updated ? updated.toJSON() : null;
};

export const deleteProgressReport = async (
  reportId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const existing = await ProjectProgressReport.findByPk(reportId);
  if (!existing) {
    return false;
  }

  if (existing.reportStatus === ReportStatus.REVIEWED) {
    throw new Error('已审核的报告无法删除');
  }

  await ProjectProgressReport.destroy({ where: { reportId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_progress_report',
    'progress_report',
    `删除进度月报: ${reportId}`,
    { reportId, projectId: existing.projectId, reportPeriod: existing.reportPeriod }
  );

  return true;
};

export const submitProgressReport = async (
  reportId: number,
  currentUser: IUserAttributes
): Promise<IProjectProgressReportAttributes | null> => {
  const existing = await ProjectProgressReport.findByPk(reportId);
  if (!existing) {
    return null;
  }

  if (existing.reportStatus !== ReportStatus.DRAFT) {
    throw new Error('只有草稿状态的报告可以提交');
  }

  await ProjectProgressReport.update(
    {
      reportStatus: ReportStatus.SUBMITTED,
      submittedBy: currentUser.userId,
      submittedAt: new Date(),
    },
    { where: { reportId } }
  );

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'submit_progress_report',
    'progress_report',
    `提交进度月报: ${reportId}`,
    { reportId, projectId: existing.projectId, reportPeriod: existing.reportPeriod }
  );

  const updated = await ProjectProgressReport.findByPk(reportId);
  return updated ? updated.toJSON() : null;
};

export const reviewProgressReport = async (
  reportId: number,
  approved: boolean,
  currentUser: IUserAttributes
): Promise<IProjectProgressReportAttributes | null> => {
  const existing = await ProjectProgressReport.findByPk(reportId);
  if (!existing) {
    return null;
  }

  if (existing.reportStatus !== ReportStatus.SUBMITTED) {
    throw new Error('只有已提交的报告可以审核');
  }

  const updateData: Partial<IProjectProgressReportAttributes> = {
    reviewedBy: currentUser.userId,
    reviewedAt: new Date(),
  };

  if (approved) {
    updateData.reportStatus = ReportStatus.REVIEWED;

    if (existing.cumulativeActualProgress !== undefined) {
      await GovernanceProject.update(
        { actualProgress: existing.cumulativeActualProgress },
        { where: { projectId: existing.projectId } }
      );
    }
  } else {
    updateData.reportStatus = ReportStatus.DRAFT;
  }

  await ProjectProgressReport.update(updateData, { where: { reportId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    approved ? 'approve_progress_report' : 'reject_progress_report',
    'progress_report',
    `${approved ? '审核通过' : '审核拒绝'}进度月报: ${reportId}`,
    { reportId, projectId: existing.projectId, reportPeriod: existing.reportPeriod, approved }
  );

  const updated = await ProjectProgressReport.findByPk(reportId);
  return updated ? updated.toJSON() : null;
};

export const getProgressTrend = async (
  query: IProgressTrendQuery,
  currentUser: IUserAttributes
): Promise<any[]> => {
  const { projectId, startTime, endTime } = query;

  const results = await ProjectProgressReport.findAll({
    where: {
      projectId,
      reportDate: {
        [Op.between]: [new Date(startTime), new Date(endTime)],
      },
      reportStatus: ReportStatus.REVIEWED,
    },
    attributes: [
      'reportPeriod',
      'monthlyPlannedProgress',
      'monthlyActualProgress',
      'cumulativePlannedProgress',
      'cumulativeActualProgress',
      'monthlyInvestmentPlan',
      'monthlyActualInvestment',
      'cumulativeInvestment',
    ],
    order: [['reportPeriod', 'ASC']],
    raw: true,
  });

  return results as any[];
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
  getProgressReportList,
  getProgressReportById,
  createProgressReport,
  updateProgressReport,
  deleteProgressReport,
  submitProgressReport,
  reviewProgressReport,
  getProgressTrend,
};
