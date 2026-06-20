import { Op, FindOptions, fn, col, literal } from 'sequelize';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import {
  WeeklyDiagnosisReport,
  RealtimeStat,
  ComplaintOrder,
  GovernanceProject,
  AnnualTask,
  Region,
  WaterBody,
  User,
} from '../models';
import { IWeeklyDiagnosisReportAttributes, IWeeklyDiagnosisReportCreationAttributes } from '../models/WeeklyDiagnosisReport';
import {
  StatType,
  ComplaintType,
  ProjectStatus,
  FundType,
  TaskStatus,
} from '../models/enums';
import { redis } from '../config';

export interface IReportQuery {
  page?: number;
  pageSize?: number;
  reportYear?: number;
  reportWeek?: number;
  regionId?: number;
  startDate?: string;
  endDate?: string;
}

export interface IReportData {
  waterQualityComplianceRate: number;
  qoqComplianceRate: number;
  yoyComplianceRate: number;
  governanceCompletionRate: number;
  qoqCompletionRate: number;
  yoyCompletionRate: number;
  publicSatisfaction: number;
  qoqSatisfaction: number;
  yoySatisfaction: number;
  complaintTypeDistribution: Record<number, { count: number; percentage: number }>;
  projectDelayAnalysis: {
    totalDelayed: number;
    delayReasons: Record<string, number>;
    averageDelayDays: number;
  };
  trendAnalysis: string;
  technicalRouteRecommendations: string;
  fundAllocationScheme: string;
  keyProblems: string;
}

const CACHE_PREFIX = 'report:';
const CACHE_TTL = 3600;

const generateReportCode = (year: number, week: number): string => {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RPT-${year}-W${String(week).padStart(2, '0')}-${random}`;
};

const getWeekNumber = (date: Date): { year: number; week: number; startDate: Date; endDate: Date } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { year: date.getFullYear(), week, startDate: startOfWeek, endDate: endOfWeek };
};

export const calculateComplaintTypeDistribution = async (
  startDate: Date,
  endDate: Date,
  regionId?: number,
  waterBodyId?: number
): Promise<Record<number, { count: number; percentage: number }>> => {
  const where: any = {
    complaintTime: { [Op.between]: [startDate, endDate] },
  };
  if (regionId) where.regionId = regionId;
  if (waterBodyId) where.waterBodyId = waterBodyId;

  const total = await ComplaintOrder.count({ where });
  const distribution: Record<number, { count: number; percentage: number }> = {};

  for (const type of Object.values(ComplaintType).filter((v) => typeof v === 'number')) {
    const count = await ComplaintOrder.count({
      where: { ...where, complaintType: type as ComplaintType },
    });
    distribution[type as number] = {
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    };
  }

  return distribution;
};

export const calculateProjectDelayAnalysis = async (
  startDate: Date,
  endDate: Date,
  regionId?: number
): Promise<{
  totalDelayed: number;
  delayReasons: Record<string, number>;
  averageDelayDays: number;
}> => {
  const where: any = {
    projectStatus: ProjectStatus.DELAYED,
  };

  if (regionId) {
    const region = await Region.findByPk(regionId, {
      include: [{ model: WaterBody, as: 'waterBodies', attributes: ['waterBodyId'] }],
    });
    if (region?.waterBodies) {
      where.waterBodyId = { [Op.in]: region.waterBodies.map((w: WaterBody) => w.waterBodyId) };
    }
  }

  const delayedProjects = await GovernanceProject.findAll({
    where,
    attributes: ['projectId', 'projectName', 'plannedEndDate', 'actualEndDate', 'mainProblems', 'progressDeviation'],
  });

  const delayReasons: Record<string, number> = {};
  let totalDelayDays = 0;

  for (const project of delayedProjects) {
    const plannedEnd = project.plannedEndDate;
    const actualEnd = project.actualEndDate || new Date();
    const delayDays = plannedEnd
      ? Math.max(0, Math.ceil((actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    totalDelayDays += delayDays;

    const reason = project.mainProblems || '其他原因';
    const reasonKey = reason.length > 50 ? reason.substring(0, 50) + '...' : reason;
    delayReasons[reasonKey] = (delayReasons[reasonKey] || 0) + 1;
  }

  return {
    totalDelayed: delayedProjects.length,
    delayReasons,
    averageDelayDays: delayedProjects.length > 0 ? Math.round(totalDelayDays / delayedProjects.length) : 0,
  };
};

export const calculateTrendAnalysis = (
  currentData: IReportData,
  lastWeekData?: IReportData
): string => {
  const trends: string[] = [];

  if (currentData.qoqComplianceRate > 0) {
    trends.push(`水质达标率环比上升${currentData.qoqComplianceRate}%，治理成效显著`);
  } else if (currentData.qoqComplianceRate < 0) {
    trends.push(`水质达标率环比下降${Math.abs(currentData.qoqComplianceRate)}%，需加强监测`);
  } else {
    trends.push('水质达标率与上周持平');
  }

  if (currentData.qoqCompletionRate > 0) {
    trends.push(`项目完成率环比上升${currentData.qoqCompletionRate}%，工程进度加快`);
  } else if (currentData.qoqCompletionRate < 0) {
    trends.push(`项目完成率环比下降${Math.abs(currentData.qoqCompletionRate)}%，需督促施工单位`);
  } else {
    trends.push('项目完成率与上周持平');
  }

  const topComplaintType = Object.entries(currentData.complaintTypeDistribution)
    .sort((a, b) => b[1].count - a[1].count)[0];

  if (topComplaintType && topComplaintType[1].count > 0) {
    const complaintTypeNames: Record<number, string> = {
      1: '黑臭水体',
      2: '污水排放',
      3: '漂浮垃圾',
      4: '植被破坏',
      5: '设施损坏',
      6: '其他',
    };
    trends.push(`投诉主要集中在${complaintTypeNames[parseInt(topComplaintType[0])] || '其他'}类型`);
  }

  if (currentData.projectDelayAnalysis.totalDelayed > 0) {
    trends.push(`有${currentData.projectDelayAnalysis.totalDelayed}个项目延期，平均延期${currentData.projectDelayAnalysis.averageDelayDays}天`);
  }

  return trends.join('；');
};

export const generateTechnicalRecommendations = (
  reportData: IReportData
): string => {
  const recommendations: string[] = [];

  if (reportData.waterQualityComplianceRate < 80) {
    recommendations.push('建议增加水质监测频次，重点关注氨氮、总磷指标');
    recommendations.push('考虑引入生物修复技术，提升水体自净能力');
  }

  const highComplaintType = Object.entries(reportData.complaintTypeDistribution)
    .sort((a, b) => b[1].count - a[1].count)[0];

  if (highComplaintType && highComplaintType[1].count > 5) {
    const typeId = parseInt(highComplaintType[0]);
    if (typeId === ComplaintType.BLACK_ODOROUS) {
      recommendations.push('针对黑臭水体投诉集中问题，建议强化截污纳管工程');
    } else if (typeId === ComplaintType.SEWAGE_DISCHARGE) {
      recommendations.push('针对污水排放投诉，建议加强排污口巡查和执法力度');
    } else if (typeId === ComplaintType.FLOATING_GARBAGE) {
      recommendations.push('针对漂浮垃圾投诉，建议增加水面保洁频次和人员配置');
    }
  }

  if (reportData.projectDelayAnalysis.totalDelayed > 3) {
    recommendations.push('建议优化施工组织设计，采用平行作业、交叉作业等方式压缩工期');
    recommendations.push('考虑引入第三方监理单位，加强进度管控');
  }

  if (recommendations.length === 0) {
    recommendations.push('各项指标运行良好，建议保持现有治理措施，持续巩固成效');
  }

  return recommendations.join('\n');
};

export const generateFundAllocationScheme = async (
  regionId: number,
  reportData: IReportData
): Promise<string> => {
  const schemes: string[] = [];

  const tasks = await AnnualTask.findAll({
    where: { regionId, year: new Date().getFullYear() },
    attributes: ['taskId', 'taskContent', 'plannedBudget', 'allocatedFunds', 'actualExpenditure', 'taskStatus', 'completionRate'],
  });

  const totalBudget = tasks.reduce((sum, t) => sum + (t.plannedBudget || 0), 0);
  const totalAllocated = tasks.reduce((sum, t) => sum + (t.allocatedFunds || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (t.actualExpenditure || 0), 0);

  schemes.push(`本年度计划预算${totalBudget.toFixed(2)}万元，已拨付${totalAllocated.toFixed(2)}万元，实际支出${totalActual.toFixed(2)}万元`);

  const delayedTasks = tasks.filter((t) => t.taskStatus === TaskStatus.DELAYED);
  if (delayedTasks.length > 0) {
    const delayedBudget = delayedTasks.reduce((sum, t) => sum + (t.plannedBudget || 0), 0);
    schemes.push(`延期项目涉及预算${delayedBudget.toFixed(2)}万元，建议根据实际进度调整资金拨付计划`);
  }

  const abnormalTasks = tasks.filter((t) => t.isBudgetAbnormal);
  if (abnormalTasks.length > 0) {
    schemes.push(`${abnormalTasks.length}个任务存在预算偏差异常，建议开展专项审计，核实用途`);
  }

  if (reportData.waterQualityComplianceRate < 85) {
    schemes.push('建议优先保障水质提升类项目资金，确保达标目标实现');
  }

  if (schemes.length === 1) {
    schemes.push('资金使用情况良好，建议按计划正常拨付');
  }

  return schemes.join('\n');
};

export const generateWeeklyReportData = async (
  regionId: number,
  referenceDate: Date = new Date()
): Promise<IReportData> => {
  const { year, week, startDate, endDate } = getWeekNumber(referenceDate);
  const lastWeekStart = new Date(startDate);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(endDate);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

  const lastYearStart = new Date(startDate);
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
  const lastYearEnd = new Date(endDate);
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

  const currentStat = await RealtimeStat.findOne({
    where: { statType: StatType.REGION, regionId, statDate: { [Op.between]: [startDate, endDate] } },
    order: [['statDate', 'DESC']],
  });

  const lastWeekStat = await RealtimeStat.findOne({
    where: { statType: StatType.REGION, regionId, statDate: { [Op.between]: [lastWeekStart, lastWeekEnd] } },
    order: [['statDate', 'DESC']],
  });

  const lastYearStat = await RealtimeStat.findOne({
    where: { statType: StatType.REGION, regionId, statDate: { [Op.between]: [lastYearStart, lastYearEnd] } },
    order: [['statDate', 'DESC']],
  });

  const waterQualityComplianceRate = currentStat?.waterQualityComplianceRate || 0;
  const governanceCompletionRate = currentStat?.governanceCompletionRate || 0;
  const publicSatisfaction = currentStat?.publicSatisfaction || 0;

  const lastWeekCompliance = lastWeekStat?.waterQualityComplianceRate || 0;
  const lastWeekCompletion = lastWeekStat?.governanceCompletionRate || 0;
  const lastWeekSatisfaction = lastWeekStat?.publicSatisfaction || 0;

  const lastYearCompliance = lastYearStat?.waterQualityComplianceRate || 0;
  const lastYearCompletion = lastYearStat?.governanceCompletionRate || 0;
  const lastYearSatisfaction = lastYearStat?.publicSatisfaction || 0;

  const qoqComplianceRate = lastWeekCompliance > 0
    ? Math.round(((waterQualityComplianceRate - lastWeekCompliance) / lastWeekCompliance) * 10000) / 100
    : waterQualityComplianceRate > 0 ? 100 : 0;

  const yoyComplianceRate = lastYearCompliance > 0
    ? Math.round(((waterQualityComplianceRate - lastYearCompliance) / lastYearCompliance) * 10000) / 100
    : waterQualityComplianceRate > 0 ? 100 : 0;

  const qoqCompletionRate = lastWeekCompletion > 0
    ? Math.round(((governanceCompletionRate - lastWeekCompletion) / lastWeekCompletion) * 10000) / 100
    : governanceCompletionRate > 0 ? 100 : 0;

  const yoyCompletionRate = lastYearCompletion > 0
    ? Math.round(((governanceCompletionRate - lastYearCompletion) / lastYearCompletion) * 10000) / 100
    : governanceCompletionRate > 0 ? 100 : 0;

  const qoqSatisfaction = lastWeekSatisfaction > 0
    ? Math.round(((publicSatisfaction - lastWeekSatisfaction) / lastWeekSatisfaction) * 10000) / 100
    : publicSatisfaction > 0 ? 100 : 0;

  const yoySatisfaction = lastYearSatisfaction > 0
    ? Math.round(((publicSatisfaction - lastYearSatisfaction) / lastYearSatisfaction) * 10000) / 100
    : publicSatisfaction > 0 ? 100 : 0;

  const complaintTypeDistribution = await calculateComplaintTypeDistribution(startDate, endDate, regionId);
  const projectDelayAnalysis = await calculateProjectDelayAnalysis(startDate, endDate, regionId);

  const reportData: IReportData = {
    waterQualityComplianceRate,
    qoqComplianceRate,
    yoyComplianceRate,
    governanceCompletionRate,
    qoqCompletionRate,
    yoyCompletionRate,
    publicSatisfaction,
    qoqSatisfaction,
    yoySatisfaction,
    complaintTypeDistribution,
    projectDelayAnalysis,
    trendAnalysis: '',
    technicalRouteRecommendations: '',
    fundAllocationScheme: '',
    keyProblems: '',
  };

  const lastWeekReportData: IReportData | undefined = lastWeekStat ? {
    waterQualityComplianceRate: lastWeekCompliance,
    qoqComplianceRate: 0,
    yoyComplianceRate: 0,
    governanceCompletionRate: lastWeekCompletion,
    qoqCompletionRate: 0,
    yoyCompletionRate: 0,
    publicSatisfaction: lastWeekSatisfaction,
    qoqSatisfaction: 0,
    yoySatisfaction: 0,
    complaintTypeDistribution: {},
    projectDelayAnalysis: { totalDelayed: 0, delayReasons: {}, averageDelayDays: 0 },
    trendAnalysis: '',
    technicalRouteRecommendations: '',
    fundAllocationScheme: '',
    keyProblems: '',
  } : undefined;

  reportData.trendAnalysis = calculateTrendAnalysis(reportData, lastWeekReportData);
  reportData.technicalRouteRecommendations = generateTechnicalRecommendations(reportData);
  reportData.fundAllocationScheme = await generateFundAllocationScheme(regionId, reportData);

  const keyProblems: string[] = [];
  if (waterQualityComplianceRate < 80) keyProblems.push('水质达标率偏低');
  if (governanceCompletionRate < 60) keyProblems.push('项目整体进度偏慢');
  if (projectDelayAnalysis.totalDelayed > 3) keyProblems.push('多个项目延期');
  if (publicSatisfaction < 70) keyProblems.push('公众满意度待提升');
  reportData.keyProblems = keyProblems.join('、') || '无重大问题';

  return reportData;
};

export const generateWeeklyReport = async (
  regionId: number,
  referenceDate: Date = new Date(),
  generatedBy?: number
): Promise<IWeeklyDiagnosisReportAttributes> => {
  const { year, week, startDate, endDate } = getWeekNumber(referenceDate);

  const existingReport = await WeeklyDiagnosisReport.findOne({
    where: { reportYear: year, reportWeek: week, regionId },
  });

  if (existingReport) {
    return existingReport.toJSON();
  }

  const reportData = await generateWeeklyReportData(regionId, referenceDate);

  const report: IWeeklyDiagnosisReportCreationAttributes = {
    reportCode: generateReportCode(year, week),
    reportYear: year,
    reportWeek: week,
    startDate,
    endDate,
    regionId,
    waterQualityComplianceRate: reportData.waterQualityComplianceRate,
    qoqComplianceRate: reportData.qoqComplianceRate,
    yoyComplianceRate: reportData.yoyComplianceRate,
    governanceCompletionRate: reportData.governanceCompletionRate,
    qoqCompletionRate: reportData.qoqCompletionRate,
    yoyCompletionRate: reportData.yoyCompletionRate,
    publicSatisfaction: reportData.publicSatisfaction,
    qoqSatisfaction: reportData.qoqSatisfaction,
    yoySatisfaction: reportData.yoySatisfaction,
    complaintTypeDistribution: reportData.complaintTypeDistribution,
    projectDelayAnalysis: reportData.projectDelayAnalysis,
    trendAnalysis: reportData.trendAnalysis,
    technicalRouteRecommendations: reportData.technicalRouteRecommendations,
    fundAllocationScheme: reportData.fundAllocationScheme,
    keyProblems: reportData.keyProblems,
    reportContent: reportData,
    generatedBy,
  };

  const createdReport = await WeeklyDiagnosisReport.create(report);
  await clearReportCache();

  return createdReport.toJSON();
};

export const generateAllRegionsWeeklyReport = async (
  referenceDate: Date = new Date(),
  generatedBy?: number
): Promise<IWeeklyDiagnosisReportAttributes[]> => {
  const regions = await Region.findAll({ attributes: ['regionId'] });
  const reports: IWeeklyDiagnosisReportAttributes[] = [];

  for (const region of regions) {
    const report = await generateWeeklyReport(region.regionId, referenceDate, generatedBy);
    reports.push(report);
  }

  return reports;
};

export const getReportList = async (
  query: IReportQuery
): Promise<{ rows: IWeeklyDiagnosisReportAttributes[]; count: number }> => {
  const { page = 1, pageSize = 10, reportYear, reportWeek, regionId, startDate, endDate } = query;

  const where: any = {};

  if (reportYear !== undefined) where.reportYear = reportYear;
  if (reportWeek !== undefined) where.reportWeek = reportWeek;
  if (regionId !== undefined) where.regionId = regionId;
  if (startDate && endDate) {
    where.startDate = { [Op.gte]: new Date(startDate) };
    where.endDate = { [Op.lte]: new Date(endDate) };
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['reportYear', 'DESC'], ['reportWeek', 'DESC']],
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
      { model: User, as: 'generator', attributes: ['userId', 'username', 'realName'] },
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

  const { rows, count } = await WeeklyDiagnosisReport.findAndCountAll(options);

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ rows, count }));
  } catch (err) {
    console.error('Cache write error:', err);
  }

  return { rows: rows.map((r) => r.toJSON()), count };
};

export const getReportById = async (reportId: number): Promise<IWeeklyDiagnosisReportAttributes | null> => {
  const report = await WeeklyDiagnosisReport.findByPk(reportId, {
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
      { model: User, as: 'generator', attributes: ['userId', 'username', 'realName'] },
    ],
  });
  return report ? report.toJSON() : null;
};

export const exportReportToExcel = async (reportId: number): Promise<string> => {
  const report = await getReportById(reportId);
  if (!report) {
    throw new Error('报告不存在');
  }

  const region = await Region.findByPk(report.regionId);

  const data = [
    ['水环境治理诊断周报'],
    ['', ''],
    ['报告编号', report.reportCode],
    ['报告周期', `${report.reportYear}年第${report.reportWeek}周`],
    ['统计范围', `${report.startDate?.toLocaleDateString()} 至 ${report.endDate?.toLocaleDateString()}`],
    ['所属区域', region?.regionName || ''],
    ['', ''],
    ['一、核心指标'],
    ['指标', '本周数值', '环比', '同比'],
    ['水质达标率(%)', report.waterQualityComplianceRate?.toFixed(2) || '0', report.qoqComplianceRate?.toFixed(2) || '0', report.yoyComplianceRate?.toFixed(2) || '0'],
    ['治理完成率(%)', report.governanceCompletionRate?.toFixed(2) || '0', report.qoqCompletionRate?.toFixed(2) || '0', report.yoyCompletionRate?.toFixed(2) || '0'],
    ['公众满意度(%)', report.publicSatisfaction?.toFixed(2) || '0', report.qoqSatisfaction?.toFixed(2) || '0', report.yoySatisfaction?.toFixed(2) || '0'],
    ['', ''],
    ['二、投诉类型分布'],
    ['投诉类型', '数量', '占比(%)'],
  ];

  const complaintTypeNames: Record<number, string> = {
    1: '黑臭水体',
    2: '污水排放',
    3: '漂浮垃圾',
    4: '植被破坏',
    5: '设施损坏',
    6: '其他',
  };

  const distribution = report.complaintTypeDistribution as Record<number, { count: number; percentage: number }>;
  if (distribution) {
    Object.entries(distribution).forEach(([type, value]) => {
      data.push([complaintTypeNames[parseInt(type)] || '其他', value.count.toString(), value.percentage.toString()]);
    });
  }

  const delayAnalysis = report.projectDelayAnalysis as { totalDelayed?: number; averageDelayDays?: number } | undefined;
  data.push(
    ['', ''],
    ['三、工程延误分析'],
    ['延期项目数', (delayAnalysis?.totalDelayed || 0).toString()],
    ['平均延期天数', (delayAnalysis?.averageDelayDays || 0).toString()],
    ['', ''],
    ['四、趋势分析'],
    [report.trendAnalysis || ''],
    ['', ''],
    ['五、技术路线建议'],
    [report.technicalRouteRecommendations || ''],
    ['', ''],
    ['六、资金调度方案'],
    [report.fundAllocationScheme || ''],
    ['', ''],
    ['七、主要问题'],
    [report.keyProblems || ''],
    ['', ''],
    ['生成时间', report.generatedAt?.toLocaleString() || '']
  );

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '周报');

  const uploadDir = path.join(process.cwd(), 'uploads', 'reports');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `${report.reportCode}.xlsx`;
  const filePath = path.join(uploadDir, fileName);
  XLSX.writeFile(workbook, filePath);

  const fileUrl = `/uploads/reports/${fileName}`;
  await WeeklyDiagnosisReport.update({ reportFileUrl: fileUrl }, { where: { reportId } });

  return fileUrl;
};

const clearReportCache = async (): Promise<void> => {
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
  generateWeeklyReportData,
  generateWeeklyReport,
  generateAllRegionsWeeklyReport,
  getReportList,
  getReportById,
  exportReportToExcel,
  calculateComplaintTypeDistribution,
  calculateProjectDelayAnalysis,
};
