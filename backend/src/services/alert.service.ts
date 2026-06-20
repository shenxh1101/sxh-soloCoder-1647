import { Op, FindOptions, fn, col, literal } from 'sequelize';
import {
  Alert,
  WaterQualityData,
  SewageOutlet,
  WaterBody,
  Region,
  GovernanceProject,
  ComplaintOrder,
  AnnualTask,
  User,
  OperationLog,
  ApprovalWorkflow,
} from '../models';
import { IAlertAttributes, IAlertCreationAttributes } from '../models/Alert';
import { IUserAttributes } from '../models/User';
import {
  AlertType,
  AlertLevel,
  SourceType,
  AlertStatus,
  PushStatus,
  DataQuality,
  UserRole,
  WorkflowType,
  UserLevel,
} from '../models/enums';
import { redis } from '../config';
import { pushAlertMessage } from './messagePush.service';
import { createApprovalWorkflow } from './approval.service';

export interface IAlertQuery {
  page?: number;
  pageSize?: number;
  alertType?: AlertType;
  alertLevel?: AlertLevel;
  alertStatus?: AlertStatus;
  regionId?: number;
  sourceType?: SourceType;
  sourceId?: number;
  startDate?: string;
  endDate?: string;
}

export interface IAlertHandleRequest {
  alertId: number;
  handleMeasure: string;
  handleResult?: string;
  handleFiles?: object;
  handlerUnit?: string;
  handlerPerson?: string;
}

const CACHE_PREFIX = 'alerts:';
const CACHE_TTL = 1800;

const generateAlertCode = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ALT-${dateStr}-${random}`;
};

const getConfigThreshold = async (key: string, defaultValue: number): Promise<number> => {
  try {
    const cached = await redis.get(`config:${key}`);
    return cached ? parseFloat(cached) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const detectContinuousOverproof = async (): Promise<IAlertCreationAttributes[]> => {
  const alerts: IAlertCreationAttributes[] = [];
  const consecutiveDays = await getConfigThreshold('alert:continuous_overproof_days', 3);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - consecutiveDays * 2 + 1);

  const outlets = await SewageOutlet.findAll({
    include: [
      { model: WaterBody, as: 'waterBody', attributes: ['waterBodyId', 'waterBodyName', 'regionId'] },
    ],
  });

  for (const outlet of outlets) {
    const dailyData = await WaterQualityData.findAll({
      where: {
        outletId: outlet.outletId,
        monitorTime: { [Op.between]: [startDate, endDate] },
        dataQuality: DataQuality.VALID,
      },
      order: [['monitorTime', 'ASC']],
    });

    const dailyStats = new Map<string, { nh3nOverproof: boolean; tpOverproof: boolean; maxNh3n: number; maxTp: number }>();

    for (const data of dailyData) {
      const dateKey = data.monitorTime.toISOString().split('T')[0];

      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, {
          nh3nOverproof: false,
          tpOverproof: false,
          maxNh3n: 0,
          maxTp: 0
        });
      }

      const dayStat = dailyStats.get(dateKey)!;
      if (data.isNh3nOverproof) {
        dayStat.nh3nOverproof = true;
        dayStat.maxNh3n = Math.max(dayStat.maxNh3n, data.ammoniaNitrogen || 0);
      }
      if (data.isTpOverproof) {
        dayStat.tpOverproof = true;
        dayStat.maxTp = Math.max(dayStat.maxTp, data.totalPhosphorus || 0);
      }
    }

    const sortedDates = Array.from(dailyStats.keys()).sort();

    if (sortedDates.length < 1) continue;

    let nh3nConsecutive = 0;
    let tpConsecutive = 0;
    let maxNh3nValue = 0;
    let maxTpValue = 0;
    let nh3nMaxConsecutive = 0;
    let tpMaxConsecutive = 0;
    let nh3nMaxValue = 0;
    let tpMaxValue = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const dateKey = sortedDates[i];
      const dayStat = dailyStats.get(dateKey)!;

      if (i > 0) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(dateKey);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          nh3nConsecutive = 0;
          tpConsecutive = 0;
          maxNh3nValue = 0;
          maxTpValue = 0;
        }
      }

      if (dayStat.nh3nOverproof) {
        nh3nConsecutive++;
        maxNh3nValue = Math.max(maxNh3nValue, dayStat.maxNh3n);
        if (nh3nConsecutive > nh3nMaxConsecutive) {
          nh3nMaxConsecutive = nh3nConsecutive;
          nh3nMaxValue = maxNh3nValue;
        }
      } else {
        nh3nConsecutive = 0;
        maxNh3nValue = 0;
      }

      if (dayStat.tpOverproof) {
        tpConsecutive++;
        maxTpValue = Math.max(maxTpValue, dayStat.maxTp);
        if (tpConsecutive > tpMaxConsecutive) {
          tpMaxConsecutive = tpConsecutive;
          tpMaxValue = maxTpValue;
        }
      } else {
        tpConsecutive = 0;
        maxTpValue = 0;
      }
    }

    nh3nConsecutive = nh3nMaxConsecutive;
    tpConsecutive = tpMaxConsecutive;
    maxNh3nValue = nh3nMaxValue;
    maxTpValue = tpMaxValue;

    const existingAlert = await Alert.findOne({
      where: {
        sourceType: SourceType.SEWAGE_OUTLET,
        sourceId: outlet.outletId,
        alertType: AlertType.WATER_QUALITY_OVERPROOF,
        alertStatus: { [Op.in]: [AlertStatus.PENDING, AlertStatus.PROCESSING] },
      },
    });

    if (existingAlert) continue;

    if (nh3nConsecutive >= consecutiveDays) {
      const threshold = await getConfigThreshold('water_quality:nh3n_standard', 1.5);
      alerts.push({
        alertCode: generateAlertCode(),
        alertType: AlertType.WATER_QUALITY_OVERPROOF,
        alertLevel: AlertLevel.LEVEL_1,
        sourceType: SourceType.SEWAGE_OUTLET,
        sourceId: outlet.outletId,
        sourceCode: outlet.outletCode,
        sourceName: outlet.outletName,
        regionId: outlet.waterBody?.regionId,
        triggerCondition: `连续${nh3nConsecutive}个自然日氨氮超标`,
        triggerValue: maxNh3nValue,
        thresholdValue: threshold,
        alertContent: `排污口【${outlet.outletName}】已连续${nh3nConsecutive}个自然日氨氮超标，最大值为${maxNh3nValue}mg/L，超过标准值${threshold}mg/L`,
        alertTime: new Date(),
        alertStatus: AlertStatus.PENDING,
        pushStatus: PushStatus.NOT_PUSHED,
        isApprovalNeeded: true,
      });
    }

    if (tpConsecutive >= consecutiveDays) {
      const threshold = await getConfigThreshold('water_quality:tp_standard', 0.3);
      alerts.push({
        alertCode: generateAlertCode(),
        alertType: AlertType.WATER_QUALITY_OVERPROOF,
        alertLevel: AlertLevel.LEVEL_1,
        sourceType: SourceType.SEWAGE_OUTLET,
        sourceId: outlet.outletId,
        sourceCode: outlet.outletCode,
        sourceName: outlet.outletName,
        regionId: outlet.waterBody?.regionId,
        triggerCondition: `连续${tpConsecutive}个自然日总磷超标`,
        triggerValue: maxTpValue,
        thresholdValue: threshold,
        alertContent: `排污口【${outlet.outletName}】已连续${tpConsecutive}个自然日总磷超标，最大值为${maxTpValue}mg/L，超过标准值${threshold}mg/L`,
        alertTime: new Date(),
        alertStatus: AlertStatus.PENDING,
        pushStatus: PushStatus.NOT_PUSHED,
        isApprovalNeeded: true,
      });
    }
  }

  return alerts;
};

export const detectProgressDelay = async (): Promise<IAlertCreationAttributes[]> => {
  const alerts: IAlertCreationAttributes[] = [];
  const deviationThreshold = await getConfigThreshold('alert:progress_deviation_threshold', 30);

  const projects = await GovernanceProject.findAll({
    include: [
      { model: WaterBody, as: 'waterBody', attributes: ['waterBodyId', 'waterBodyName', 'regionId'] },
    ],
  });

  for (const project of projects) {
    const actualProgress = project.actualProgress || 0;
    const plannedProgress = project.plannedProgress || 0;
    const deviation = plannedProgress - actualProgress;

    if (deviation <= deviationThreshold) continue;
    if (actualProgress > plannedProgress) continue;

    const existingAlert = await Alert.findOne({
      where: {
        sourceType: SourceType.PROJECT,
        sourceId: project.projectId,
        alertType: AlertType.PROGRESS_DELAY,
        alertStatus: { [Op.in]: [AlertStatus.PENDING, AlertStatus.PROCESSING] },
      },
    });

    if (existingAlert) continue;

    alerts.push({
      alertCode: generateAlertCode(),
      alertType: AlertType.PROGRESS_DELAY,
      alertLevel: AlertLevel.LEVEL_1,
      sourceType: SourceType.PROJECT,
      sourceId: project.projectId,
      sourceCode: project.projectCode,
      sourceName: project.projectName,
      regionId: project.waterBody?.regionId,
      triggerCondition: `实际进度落后计划超过${deviationThreshold}%`,
      triggerValue: deviation,
      thresholdValue: deviationThreshold,
      alertContent: `项目【${project.projectName}】实际进度${actualProgress}%，计划进度${plannedProgress}%，进度落后${deviation.toFixed(1)}%，超过阈值${deviationThreshold}%`,
      alertTime: new Date(),
      alertStatus: AlertStatus.PENDING,
      pushStatus: PushStatus.NOT_PUSHED,
      isApprovalNeeded: true,
    });
  }

  return alerts;
};

export const detectFundAbnormal = async (): Promise<IAlertCreationAttributes[]> => {
  const alerts: IAlertCreationAttributes[] = [];
  const deviationThreshold = await getConfigThreshold('alert:fund_deviation_threshold', 15);

  const tasks = await AnnualTask.findAll({
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
    ],
  });

  for (const task of tasks) {
    const deviation = Math.abs(task.budgetDeviation || 0);
    if (deviation < deviationThreshold || !task.isBudgetAbnormal) continue;

    const existingAlert = await Alert.findOne({
      where: {
        sourceType: SourceType.REGION,
        sourceId: task.regionId,
        alertType: AlertType.FUND_ABNORMAL,
        alertStatus: { [Op.in]: [AlertStatus.PENDING, AlertStatus.PROCESSING] },
      },
    });

    if (existingAlert) continue;

    alerts.push({
      alertCode: generateAlertCode(),
      alertType: AlertType.FUND_ABNORMAL,
      alertLevel: deviation >= 30 ? AlertLevel.LEVEL_1 : AlertLevel.LEVEL_2,
      sourceType: SourceType.REGION,
      sourceId: task.regionId,
      sourceName: task.region?.regionName,
      regionId: task.regionId,
      triggerCondition: `预算偏差超过${deviationThreshold}%`,
      triggerValue: deviation,
      thresholdValue: deviationThreshold,
      alertContent: `区域【${task.region?.regionName}】年度任务【${task.taskContent}】预算偏差${deviation}%，超过阈值${deviationThreshold}%，${task.abnormalReminder || ''}`,
      alertTime: new Date(),
      alertStatus: AlertStatus.PENDING,
      pushStatus: PushStatus.NOT_PUSHED,
      isApprovalNeeded: deviation >= 30,
    });
  }

  return alerts;
};

export const detectComplaintConcentration = async (): Promise<IAlertCreationAttributes[]> => {
  const alerts: IAlertCreationAttributes[] = [];
  const suddenIncreaseThreshold = await getConfigThreshold('alert:complaint_sudden_increase', 3);
  const endDate = new Date();
  const currentStartDate = new Date();
  currentStartDate.setDate(currentStartDate.getDate() - 7);
  const lastStartDate = new Date();
  lastStartDate.setDate(lastStartDate.getDate() - 14);

  const regions = await Region.findAll({ attributes: ['regionId', 'regionName', 'regionCode'] });

  for (const region of regions) {
    const currentCount = await ComplaintOrder.count({
      where: {
        regionId: region.regionId,
        complaintTime: { [Op.between]: [currentStartDate, endDate] },
      },
    });

    const lastCount = await ComplaintOrder.count({
      where: {
        regionId: region.regionId,
        complaintTime: { [Op.between]: [lastStartDate, currentStartDate] },
      },
    });

    const increaseRate = lastCount > 0 ? ((currentCount - lastCount) / lastCount) * 100 : currentCount * 100;

    if (increaseRate < suddenIncreaseThreshold * 100) continue;

    const existingAlert = await Alert.findOne({
      where: {
        sourceType: SourceType.REGION,
        sourceId: region.regionId,
        alertType: AlertType.COMPLAINT_CONCENTRATION,
        alertStatus: { [Op.in]: [AlertStatus.PENDING, AlertStatus.PROCESSING] },
      },
    });

    if (existingAlert) continue;

    alerts.push({
      alertCode: generateAlertCode(),
      alertType: AlertType.COMPLAINT_CONCENTRATION,
      alertLevel: currentCount >= 10 ? AlertLevel.LEVEL_1 : AlertLevel.LEVEL_2,
      sourceType: SourceType.REGION,
      sourceId: region.regionId,
      sourceCode: region.regionCode,
      sourceName: region.regionName,
      regionId: region.regionId,
      triggerCondition: `投诉量环比增长超过${suddenIncreaseThreshold}倍`,
      triggerValue: Math.round(increaseRate),
      thresholdValue: suddenIncreaseThreshold * 100,
      alertContent: `区域【${region.regionName}】近7天投诉量${currentCount}件，较上周${lastCount}件增长${Math.round(increaseRate)}%，投诉呈现集中趋势`,
      alertTime: new Date(),
      alertStatus: AlertStatus.PENDING,
      pushStatus: PushStatus.NOT_PUSHED,
      isApprovalNeeded: currentCount >= 10,
    });
  }

  return alerts;
};

const mapAlertTypeToWorkflowType = (alertType: AlertType): WorkflowType => {
  switch (alertType) {
    case AlertType.WATER_QUALITY_OVERPROOF: return WorkflowType.EMERGENCY_SEWAGE_INTERCEPTION;
    case AlertType.PROGRESS_DELAY: return WorkflowType.GOVERNANCE_PLAN_ADJUSTMENT;
    case AlertType.FUND_ABNORMAL: return WorkflowType.FUND_ADJUSTMENT;
    default: return WorkflowType.GOVERNANCE_PLAN_ADJUSTMENT;
  }
};

export const detectAndCreateAlerts = async (): Promise<Alert[]> => {
  const allAlerts: IAlertCreationAttributes[] = [];

  const overproofAlerts = await detectContinuousOverproof();
  allAlerts.push(...overproofAlerts);

  const progressAlerts = await detectProgressDelay();
  allAlerts.push(...progressAlerts);

  const fundAlerts = await detectFundAbnormal();
  allAlerts.push(...fundAlerts);

  const complaintAlerts = await detectComplaintConcentration();
  allAlerts.push(...complaintAlerts);

  const createdAlerts: Alert[] = [];
  for (const alertData of allAlerts) {
    const alert = await Alert.create(alertData);
    createdAlerts.push(alert);

    try {
      await pushAlertMessage(alert);
    } catch (err) {
      console.error('Failed to push alert message:', err);
    }

    if (alert.isApprovalNeeded && alert.regionId) {
      try {
        await createApprovalWorkflow({
          workflowType: mapAlertTypeToWorkflowType(alert.alertType),
          relatedAlertId: alert.alertId,
          regionId: alert.regionId,
          applicationContent: alert.alertContent,
          applicationReason: alert.triggerCondition || '一级预警自动触发',
          proposedScheme: '待治理单位确认后制定',
        }, { userId: 0, username: 'system', department: '系统自动' });
      } catch (err) {
        console.error('Failed to create approval workflow for alert:', err);
      }
    }
  }

  await clearAlertCache();

  return createdAlerts;
};

const mapAlertLevel = (level: AlertLevel): string => {
  switch (level) {
    case AlertLevel.LEVEL_1: return 'critical';
    case AlertLevel.LEVEL_2: return 'high';
    case AlertLevel.LEVEL_3: return 'medium';
    default: return 'low';
  }
};

const mapAlertType = (type: AlertType): string => {
  switch (type) {
    case AlertType.WATER_QUALITY_OVERPROOF: return 'water_quality';
    case AlertType.PROGRESS_DELAY: return 'project';
    case AlertType.FUND_ABNORMAL: return 'fund';
    case AlertType.COMPLAINT_CONCENTRATION: return 'complaint';
    default: return 'water_quality';
  }
};

const mapAlertStatus = (status: AlertStatus): string => {
  switch (status) {
    case AlertStatus.PENDING: return 'pending';
    case AlertStatus.PROCESSING: return 'processing';
    case AlertStatus.PROCESSED: return 'processing';
    case AlertStatus.RESOLVED: return 'resolved';
    case AlertStatus.IGNORED: return 'closed';
    default: return 'pending';
  }
};

const transformAlertToFrontend = (alert: any) => {
  const json = alert && typeof alert.toJSON === 'function' ? alert.toJSON() : alert;
  return {
    id: json.alertId,
    code: json.alertCode,
    title: json.alertContent,
    level: mapAlertLevel(json.alertLevel),
    type: mapAlertType(json.alertType),
    waterBodyId: json.sourceId,
    waterBodyName: json.sourceName,
    description: json.alertContent,
    triggerCondition: json.triggerCondition,
    triggerValue: json.triggerValue,
    thresholdValue: json.thresholdValue,
    status: mapAlertStatus(json.alertStatus),
    handlerName: json.handlerPerson,
    handleTime: json.handleTime,
    handleResult: json.handleResult,
    regionId: json.regionId,
    regionName: json.region?.regionName,
    createdAt: json.alertTime,
    updatedAt: json.updatedAt,
  };
};

export const getAlertList = async (
  query: {
    page?: number;
    pageSize?: number;
    alertLevel?: AlertLevel;
    alertType?: AlertType;
    alertStatus?: AlertStatus;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    regionId?: number;
  },
  currentUser: IUserAttributes
): Promise<{ rows: any[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    alertLevel,
    alertType,
    alertStatus,
    keyword,
    startDate,
    endDate,
    regionId,
  } = query;

  const where: any = {};

  if (alertLevel !== undefined) where.alertLevel = alertLevel;
  if (alertType !== undefined) where.alertType = alertType;
  if (alertStatus !== undefined) where.alertStatus = alertStatus;
  if (regionId !== undefined) where.regionId = regionId;
  if (keyword) {
    where.alertContent = { [Op.like]: `%${keyword}%` };
  }
  if (startDate && endDate) {
    where.alertTime = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  if (currentUser.userLevel === UserLevel.PROVINCIAL) {
    const region = await Region.findByPk(currentUser.regionId);
    if (region) {
      const subRegions = await Region.findAll({
        where: { parentId: currentUser.regionId },
        attributes: ['regionId'],
      });
      const regionIds = [currentUser.regionId, ...subRegions.map(r => r.regionId)];
      where.regionId = { [Op.in]: regionIds };
    }
  } else if (currentUser.userLevel === UserLevel.MUNICIPAL) {
    where.regionId = currentUser.regionId;
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['alertTime', 'DESC']],
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
    ],
  };

  const { rows, count } = await Alert.findAndCountAll(options);

  const transformedRows = rows.map(row => transformAlertToFrontend(row));

  return { rows: transformedRows, count };
};

export const getAlertDetail = async (
  alertId: number,
  currentUser: IUserAttributes
): Promise<any | null> => {
  const alert = await Alert.findByPk(alertId, {
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
    ],
  });

  if (!alert) return null;

  const alertJson = alert.toJSON();

  if (currentUser.userLevel === UserLevel.PROVINCIAL) {
    const region = await Region.findByPk(currentUser.regionId);
    if (region) {
      const subRegions = await Region.findAll({
        where: { parentId: currentUser.regionId },
        attributes: ['regionId'],
      });
      const regionIds = [currentUser.regionId, ...subRegions.map(r => r.regionId)];
      if (!regionIds.includes(alertJson.regionId!)) {
        return null;
      }
    }
  } else if (currentUser.userLevel === UserLevel.MUNICIPAL) {
    if (alertJson.regionId !== currentUser.regionId) {
      return null;
    }
  }

  const operationLogs = await OperationLog.findAll({
    where: {
      moduleName: 'alert',
      operationContent: { [Op.like]: `%${alertId}%` },
    },
    order: [['operationTime', 'DESC']],
    limit: 50,
  });

  const history = operationLogs.map(log => ({
    id: log.logId,
    operator: log.username || '系统',
    action: log.operationType,
    remark: log.operationContent,
    time: log.operationTime,
  }));

  const approval = await ApprovalWorkflow.findOne({
    where: { relatedAlertId: alertId },
    attributes: ['workflowId', 'workflowCode', 'currentStage', 'workflowStatus'],
  });

  const approvalInfo = approval ? {
    workflowId: approval.workflowId,
    workflowCode: approval.workflowCode,
    currentStage: approval.currentStage,
    workflowStatus: approval.workflowStatus,
  } : undefined;

  const result = transformAlertToFrontend(alertJson);
  return {
    ...result,
    history,
    approvalInfo,
  };
};

export const getAlertById = async (alertId: number): Promise<IAlertAttributes | null> => {
  const alert = await Alert.findByPk(alertId, {
    include: [
      { model: Region, as: 'region', attributes: ['regionId', 'regionName'] },
    ],
  });
  return alert ? alert.toJSON() : null;
};

export const handleAlert = async (
  request: IAlertHandleRequest,
  currentUser: { userId: number; username: string }
): Promise<IAlertAttributes | null> => {
  const alert = await Alert.findByPk(request.alertId);
  if (!alert) {
    return null;
  }

  if (alert.alertStatus === AlertStatus.RESOLVED || alert.alertStatus === AlertStatus.IGNORED) {
    throw new Error('该预警已处理完成，无法重复处理');
  }

  const updateData: any = {
    handleMeasure: request.handleMeasure,
    handleResult: request.handleResult,
    handleFiles: request.handleFiles,
    handlerUnit: request.handlerUnit,
    handlerPerson: request.handlerPerson,
    handleTime: new Date(),
    alertStatus: AlertStatus.PROCESSED,
  };

  await Alert.update(updateData, { where: { alertId: request.alertId } });

  await clearAlertCache();

  const updatedAlert = await Alert.findByPk(request.alertId);
  return updatedAlert ? updatedAlert.toJSON() : null;
};

export const resolveAlert = async (
  alertId: number,
  handleResult: string,
  currentUser: { userId: number; username: string }
): Promise<IAlertAttributes | null> => {
  const alert = await Alert.findByPk(alertId);
  if (!alert) {
    return null;
  }

  await Alert.update(
    {
      alertStatus: AlertStatus.RESOLVED,
      handleResult,
      handleTime: new Date(),
    },
    { where: { alertId } }
  );

  await clearAlertCache();

  const updatedAlert = await Alert.findByPk(alertId);
  return updatedAlert ? updatedAlert.toJSON() : null;
};

export const ignoreAlert = async (
  alertId: number,
  reason: string,
  currentUser: { userId: number; username: string }
): Promise<IAlertAttributes | null> => {
  const alert = await Alert.findByPk(alertId);
  if (!alert) {
    return null;
  }

  await Alert.update(
    {
      alertStatus: AlertStatus.IGNORED,
      handleResult: `忽略原因：${reason}`,
      handleTime: new Date(),
    },
    { where: { alertId } }
  );

  await clearAlertCache();

  const updatedAlert = await Alert.findByPk(alertId);
  return updatedAlert ? updatedAlert.toJSON() : null;
};

export const getAlertStatistics = async (
  regionId?: number,
  startDate?: string,
  endDate?: string
): Promise<{
  total: number;
  pending: number;
  processing: number;
  processed: number;
  resolved: number;
  byType: Record<number, number>;
  byLevel: Record<number, number>;
}> => {
  const where: any = {};

  if (regionId !== undefined) where.regionId = regionId;
  if (startDate && endDate) {
    where.alertTime = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  const total = await Alert.count({ where });
  const pending = await Alert.count({ where: { ...where, alertStatus: AlertStatus.PENDING } });
  const processing = await Alert.count({ where: { ...where, alertStatus: AlertStatus.PROCESSING } });
  const processed = await Alert.count({ where: { ...where, alertStatus: AlertStatus.PROCESSED } });
  const resolved = await Alert.count({ where: { ...where, alertStatus: AlertStatus.RESOLVED } });

  const byType: Record<number, number> = {};
  for (const type of Object.values(AlertType).filter((v) => typeof v === 'number')) {
    byType[type as number] = await Alert.count({ where: { ...where, alertType: type as AlertType } });
  }

  const byLevel: Record<number, number> = {};
  for (const level of Object.values(AlertLevel).filter((v) => typeof v === 'number')) {
    byLevel[level as number] = await Alert.count({ where: { ...where, alertLevel: level as AlertLevel } });
  }

  return { total, pending, processing, processed, resolved, byType, byLevel };
};

const clearAlertCache = async (): Promise<void> => {
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
  detectContinuousOverproof,
  detectProgressDelay,
  detectFundAbnormal,
  detectComplaintConcentration,
  detectAndCreateAlerts,
  getAlertList,
  getAlertDetail,
  getAlertById,
  handleAlert,
  resolveAlert,
  ignoreAlert,
  getAlertStatistics,
};
