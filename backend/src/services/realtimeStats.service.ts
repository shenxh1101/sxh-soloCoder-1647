import { Op, FindOptions, fn, col, literal } from 'sequelize';
import {
  WaterQualityData,
  GovernanceProject,
  ComplaintOrder,
  SewageOutlet,
  Region,
  WaterBody,
  RealtimeStat,
} from '../models';
import { IRealtimeStatAttributes, IRealtimeStatCreationAttributes } from '../models/RealtimeStat';
import { StatType, StatPeriod, DataQuality } from '../models/enums';
import { redis } from '../config';

export interface IStatQuery {
  page?: number;
  pageSize?: number;
  statType?: StatType;
  regionId?: number;
  waterBodyId?: number;
  outletId?: number;
  projectId?: number;
  statPeriod?: StatPeriod;
  startDate?: string;
  endDate?: string;
}

export interface IStatResult {
  waterQualityComplianceRate: number;
  governanceCompletionRate: number;
  publicSatisfaction: number;
  outletAbnormalityIndex: number;
  overproofCount: number;
  totalMonitorCount: number;
  complaintCount: number;
  completedProjectCount: number;
  totalProjectCount: number;
  additionalData?: {
    yearOnYear?: number;
    monthOnMonth?: number;
  };
}

const CACHE_PREFIX = 'realtime_stats:';
const CACHE_TTL = 3600;

const getConfigThreshold = async (key: string, defaultValue: number): Promise<number> => {
  try {
    const cached = await redis.get(`config:${key}`);
    return cached ? parseFloat(cached) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const calculateWaterQualityComplianceRate = async (
  regionId?: number,
  waterBodyId?: number,
  outletId?: number,
  days: number = 7
): Promise<{ rate: number; overproofCount: number; totalCount: number }> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = {
    monitorTime: { [Op.between]: [startDate, endDate] },
    dataQuality: DataQuality.VALID,
  };

  if (outletId) {
    where.outletId = outletId;
  } else if (waterBodyId) {
    const outlets = await SewageOutlet.findAll({ where: { waterBodyId }, attributes: ['outletId'] });
    where.outletId = { [Op.in]: outlets.map((o) => o.outletId) };
  } else if (regionId) {
    const waterBodies = await WaterBody.findAll({ where: { regionId }, attributes: ['waterBodyId'] });
    const outlets = await SewageOutlet.findAll({
      where: { waterBodyId: { [Op.in]: waterBodies.map((w) => w.waterBodyId) } },
      attributes: ['outletId'],
    });
    where.outletId = { [Op.in]: outlets.map((o) => o.outletId) };
  }

  const { count, rows } = await WaterQualityData.findAndCountAll({ where });
  const overproofCount = rows.filter((r) => !r.isCompliant).length;
  const rate = count > 0 ? Math.round(((count - overproofCount) / count) * 10000) / 100 : 0;

  return { rate, overproofCount, totalCount: count };
};

export const calculateGovernanceCompletionRate = async (
  regionId?: number,
  waterBodyId?: number,
  projectId?: number
): Promise<{ rate: number; completedCount: number; totalCount: number }> => {
  const where: any = {};

  if (projectId) {
    where.projectId = projectId;
  } else if (waterBodyId) {
    where.waterBodyId = waterBodyId;
  } else if (regionId) {
    const waterBodies = await WaterBody.findAll({ where: { regionId }, attributes: ['waterBodyId'] });
    where.waterBodyId = { [Op.in]: waterBodies.map((w) => w.waterBodyId) };
  }

  const { count, rows } = await GovernanceProject.findAndCountAll({
    where,
    attributes: ['actualProgress', 'plannedProgress'],
  });

  if (count === 0) {
    return { rate: 0, completedCount: 0, totalCount: 0 };
  }

  const totalProgress = rows.reduce((sum, p) => sum + (p.actualProgress || 0), 0);
  const rate = Math.round((totalProgress / count) * 100) / 100;
  const completedCount = rows.filter((p) => (p.actualProgress || 0) >= 100).length;

  return { rate, completedCount, totalCount: count };
};

export const calculatePublicSatisfaction = async (
  regionId?: number,
  waterBodyId?: number,
  days: number = 30
): Promise<{ score: number; complaintCount: number }> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = {
    complaintTime: { [Op.between]: [startDate, endDate] },
    satisfactionScore: { [Op.ne]: null },
  };

  if (waterBodyId) {
    where.waterBodyId = waterBodyId;
  } else if (regionId) {
    where.regionId = regionId;
  }

  const { count, rows } = await ComplaintOrder.findAndCountAll({
    where,
    attributes: ['satisfactionScore'],
  });

  if (count === 0) {
    return { score: 0, complaintCount: 0 };
  }

  const totalScore = rows.reduce((sum, c) => sum + (c.satisfactionScore || 0), 0);
  const avgScore = Math.round((totalScore / count) * 100) / 100;
  const satisfaction = Math.round((avgScore / 5) * 10000) / 100;

  return { score: satisfaction, complaintCount: count };
};

export const calculateOutletAbnormalityIndex = async (
  regionId?: number,
  waterBodyId?: number,
  outletId?: number,
  days: number = 3
): Promise<{ index: number; overproofCount: number; totalCount: number }> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = {
    monitorTime: { [Op.between]: [startDate, endDate] },
    dataQuality: DataQuality.VALID,
  };

  if (outletId) {
    where.outletId = outletId;
  } else if (waterBodyId) {
    const outlets = await SewageOutlet.findAll({ where: { waterBodyId }, attributes: ['outletId'] });
    where.outletId = { [Op.in]: outlets.map((o) => o.outletId) };
  } else if (regionId) {
    const waterBodies = await WaterBody.findAll({ where: { regionId }, attributes: ['waterBodyId'] });
    const outlets = await SewageOutlet.findAll({
      where: { waterBodyId: { [Op.in]: waterBodies.map((w) => w.waterBodyId) } },
      attributes: ['outletId'],
    });
    where.outletId = { [Op.in]: outlets.map((o) => o.outletId) };
  }

  const { count, rows } = await WaterQualityData.findAndCountAll({ where });
  const overproofCount = rows.filter((r) => r.isNh3nOverproof || r.isTpOverproof).length;
  const index = count > 0 ? Math.round((overproofCount / count) * 10000) / 100 : 0;

  return { index, overproofCount, totalCount: count };
};

export const calculateYearOnYear = async (
  statType: StatType,
  currentValue: number,
  statDate: Date,
  regionId?: number,
  waterBodyId?: number,
  outletId?: number,
  projectId?: number
): Promise<number> => {
  const lastYearDate = new Date(statDate);
  lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);

  const lastYearStat = await RealtimeStat.findOne({
    where: {
      statType,
      statDate: lastYearDate,
      ...(regionId && { regionId }),
      ...(waterBodyId && { waterBodyId }),
      ...(outletId && { outletId }),
      ...(projectId && { projectId }),
    },
  });

  if (!lastYearStat) return 0;

  const lastYearValue =
    statType === StatType.REGION || statType === StatType.WATER_BODY
      ? lastYearStat.waterQualityComplianceRate || 0
      : statType === StatType.PROJECT
      ? lastYearStat.governanceCompletionRate || 0
      : lastYearStat.outletAbnormalityIndex || 0;

  return lastYearValue > 0 ? Math.round(((currentValue - lastYearValue) / lastYearValue) * 10000) / 100 : 0;
};

export const calculateMonthOnMonth = async (
  statType: StatType,
  currentValue: number,
  statDate: Date,
  regionId?: number,
  waterBodyId?: number,
  outletId?: number,
  projectId?: number
): Promise<number> => {
  const lastMonthDate = new Date(statDate);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

  const lastMonthStat = await RealtimeStat.findOne({
    where: {
      statType,
      statDate: lastMonthDate,
      ...(regionId && { regionId }),
      ...(waterBodyId && { waterBodyId }),
      ...(outletId && { outletId }),
      ...(projectId && { projectId }),
    },
  });

  if (!lastMonthStat) return 0;

  const lastMonthValue =
    statType === StatType.REGION || statType === StatType.WATER_BODY
      ? lastMonthStat.waterQualityComplianceRate || 0
      : statType === StatType.PROJECT
      ? lastMonthStat.governanceCompletionRate || 0
      : lastMonthStat.outletAbnormalityIndex || 0;

  return lastMonthValue > 0 ? Math.round(((currentValue - lastMonthValue) / lastMonthValue) * 10000) / 100 : 0;
};

export const calculateAndSaveStats = async (statDate: Date = new Date()): Promise<void> => {
  const dateOnly = new Date(statDate.toDateString());

  const regions = await Region.findAll({ attributes: ['regionId'] });
  for (const region of regions) {
    await calculateStatsForEntity(StatType.REGION, dateOnly, region.regionId);
  }

  const waterBodies = await WaterBody.findAll({ attributes: ['waterBodyId', 'regionId'] });
  for (const waterBody of waterBodies) {
    await calculateStatsForEntity(StatType.WATER_BODY, dateOnly, undefined, waterBody.waterBodyId);
  }

  const outlets = await SewageOutlet.findAll({ attributes: ['outletId', 'waterBodyId'] });
  for (const outlet of outlets) {
    await calculateStatsForEntity(StatType.SEWAGE_OUTLET, dateOnly, undefined, undefined, outlet.outletId);
  }

  const projects = await GovernanceProject.findAll({ attributes: ['projectId', 'waterBodyId'] });
  for (const project of projects) {
    await calculateStatsForEntity(StatType.PROJECT, dateOnly, undefined, undefined, undefined, project.projectId);
  }

  await clearStatsCache();
};

const calculateStatsForEntity = async (
  statType: StatType,
  statDate: Date,
  regionId?: number,
  waterBodyId?: number,
  outletId?: number,
  projectId?: number
): Promise<void> => {
  const waterQualityResult = await calculateWaterQualityComplianceRate(regionId, waterBodyId, outletId);
  const governanceResult = await calculateGovernanceCompletionRate(regionId, waterBodyId, projectId);
  const satisfactionResult = await calculatePublicSatisfaction(regionId, waterBodyId);
  const abnormalityResult = await calculateOutletAbnormalityIndex(regionId, waterBodyId, outletId);

  const yearOnYear = await calculateYearOnYear(
    statType,
    waterQualityResult.rate,
    statDate,
    regionId,
    waterBodyId,
    outletId,
    projectId
  );
  const monthOnMonth = await calculateMonthOnMonth(
    statType,
    waterQualityResult.rate,
    statDate,
    regionId,
    waterBodyId,
    outletId,
    projectId
  );

  const statData: IRealtimeStatCreationAttributes = {
    statType,
    statDate,
    statPeriod: StatPeriod.DAY,
    regionId,
    waterBodyId,
    outletId,
    projectId,
    waterQualityComplianceRate: waterQualityResult.rate,
    governanceCompletionRate: governanceResult.rate,
    publicSatisfaction: satisfactionResult.score,
    outletAbnormalityIndex: abnormalityResult.index,
    overproofCount: waterQualityResult.overproofCount,
    totalMonitorCount: waterQualityResult.totalCount,
    complaintCount: satisfactionResult.complaintCount,
    completedProjectCount: governanceResult.completedCount,
    totalProjectCount: governanceResult.totalCount,
    additionalData: {
      yearOnYear,
      monthOnMonth,
    },
  };

  const [createdStat] = await RealtimeStat.upsert(statData);
  await createdStat.update({ calculatedAt: new Date() });
};

export const getStatList = async (
  query: IStatQuery
): Promise<{ rows: IRealtimeStatAttributes[]; count: number }> => {
  const { page = 1, pageSize = 10, statType, regionId, waterBodyId, outletId, projectId, statPeriod, startDate, endDate } = query;

  const where: any = {};

  if (statType !== undefined) where.statType = statType;
  if (regionId !== undefined) where.regionId = regionId;
  if (waterBodyId !== undefined) where.waterBodyId = waterBodyId;
  if (outletId !== undefined) where.outletId = outletId;
  if (projectId !== undefined) where.projectId = projectId;
  if (statPeriod) where.statPeriod = statPeriod;
  if (startDate && endDate) {
    where.statDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['statDate', 'DESC']],
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
      { model: WaterBody, as: 'waterBody', attributes: ['waterBodyId', 'waterBodyName'] },
      { model: SewageOutlet, as: 'sewageOutlet', attributes: ['outletId', 'outletCode'] },
      { model: GovernanceProject, as: 'project', attributes: ['projectId', 'projectName'] },
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

  const { rows, count } = await RealtimeStat.findAndCountAll(options);

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ rows, count }));
  } catch (err) {
    console.error('Cache write error:', err);
  }

  return { rows: rows.map((r) => r.toJSON()), count };
};

export const getLatestStats = async (
  statType: StatType,
  regionId?: number,
  waterBodyId?: number,
  outletId?: number,
  projectId?: number
): Promise<IRealtimeStatAttributes | null> => {
  const where: any = { statType };
  if (regionId !== undefined) where.regionId = regionId;
  if (waterBodyId !== undefined) where.waterBodyId = waterBodyId;
  if (outletId !== undefined) where.outletId = outletId;
  if (projectId !== undefined) where.projectId = projectId;

  const cacheKey = `${CACHE_PREFIX}latest:${statType}:${regionId || ''}:${waterBodyId || ''}:${outletId || ''}:${projectId || ''}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }

  const stat = await RealtimeStat.findOne({
    where,
    order: [['statDate', 'DESC']],
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
      { model: WaterBody, as: 'waterBody', attributes: ['waterBodyId', 'waterBodyName'] },
      { model: SewageOutlet, as: 'sewageOutlet', attributes: ['outletId', 'outletCode'] },
      { model: GovernanceProject, as: 'project', attributes: ['projectId', 'projectName'] },
    ],
  });

  if (stat) {
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(stat.toJSON()));
    } catch (err) {
      console.error('Cache write error:', err);
    }
    return stat.toJSON();
  }

  return null;
};

export const getTrendStats = async (
  statType: StatType,
  startDate: string,
  endDate: string,
  regionId?: number,
  waterBodyId?: number,
  outletId?: number,
  projectId?: number
): Promise<IRealtimeStatAttributes[]> => {
  const where: any = {
    statType,
    statDate: { [Op.between]: [new Date(startDate), new Date(endDate)] },
  };

  if (regionId !== undefined) where.regionId = regionId;
  if (waterBodyId !== undefined) where.waterBodyId = waterBodyId;
  if (outletId !== undefined) where.outletId = outletId;
  if (projectId !== undefined) where.projectId = projectId;

  const stats = await RealtimeStat.findAll({
    where,
    order: [['statDate', 'ASC']],
  });

  return stats.map((s) => s.toJSON());
};

const clearStatsCache = async (): Promise<void> => {
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
  calculateWaterQualityComplianceRate,
  calculateGovernanceCompletionRate,
  calculatePublicSatisfaction,
  calculateOutletAbnormalityIndex,
  calculateAndSaveStats,
  getStatList,
  getLatestStats,
  getTrendStats,
};
