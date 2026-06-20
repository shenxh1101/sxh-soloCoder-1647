import { Op, FindOptions, fn, col } from 'sequelize';
import { ComplaintOrder, IComplaintOrderAttributes, IComplaintOrderCreationAttributes } from '../models/ComplaintOrder';
import { WaterBody } from '../models/WaterBody';
import { Region } from '../models/Region';
import { OperationLog } from '../models/OperationLog';
import { IUserAttributes } from '../models/User';
import { ComplaintType, OrderStatus, Priority } from '../models/enums';
import { applyDataPermissionFilter } from './permission.service';

export interface IComplaintQuery {
  page?: number;
  pageSize?: number;
  complaintCode?: string;
  waterBodyId?: number;
  regionId?: number;
  complaintType?: ComplaintType;
  orderStatus?: OrderStatus;
  priority?: Priority;
  startTime?: string;
  endTime?: string;
  handlerPerson?: string;
}

export interface IComplaintStatsQuery {
  regionId?: number;
  waterBodyId?: number;
  startTime?: string;
  endTime?: string;
  groupBy?: 'complaintType' | 'orderStatus' | 'region' | 'month';
}

const HOT_KEYWORDS = [
  '黑臭', '污水', '垃圾', '漂浮物', '臭味', '异味',
  '排污', '乱排', '偷排', '污染', '浑浊', '变色',
  '死鱼', '杂草', '淤泥', '堵塞', '渗漏', '破损',
  '噪音', '蚊虫', '苍蝇', '臭气', '排水', '管网',
];

const extractHotKeywords = (content: string): string[] => {
  const keywords: string[] = [];
  const lowerContent = content.toLowerCase();

  for (const keyword of HOT_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return keywords;
};

const calculatePriority = (complaintType: ComplaintType, content: string): Priority => {
  const urgentKeywords = ['严重', '紧急', '大量', '大面积', '中毒', '死亡'];
  const lowerContent = content.toLowerCase();

  if (complaintType === ComplaintType.BLACK_ODOROUS || complaintType === ComplaintType.SEWAGE_DISCHARGE) {
    for (const keyword of urgentKeywords) {
      if (lowerContent.includes(keyword)) {
        return Priority.URGENT;
      }
    }
  }

  return Priority.NORMAL;
};

export const getComplaintList = async (
  query: IComplaintQuery,
  currentUser: IUserAttributes
): Promise<{ rows: IComplaintOrderAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    complaintCode,
    waterBodyId,
    regionId,
    complaintType,
    orderStatus,
    priority,
    startTime,
    endTime,
    handlerPerson,
  } = query;

  const where: any = {};

  if (complaintCode) {
    where.complaintCode = { [Op.like]: `%${complaintCode}%` };
  }
  if (waterBodyId) {
    where.waterBodyId = waterBodyId;
  }
  if (regionId) {
    where.regionId = regionId;
  }
  if (complaintType !== undefined) {
    where.complaintType = complaintType;
  }
  if (orderStatus !== undefined) {
    where.orderStatus = orderStatus;
  }
  if (priority !== undefined) {
    where.priority = priority;
  }
  if (startTime) {
    where.complaintTime = { [Op.gte]: new Date(startTime) };
  }
  if (endTime) {
    where.complaintTime = { ...where.complaintTime, [Op.lte]: new Date(endTime) };
  }
  if (handlerPerson) {
    where.handlerPerson = { [Op.like]: `%${handlerPerson}%` };
  }

  const include: any[] = [
    {
      model: WaterBody,
      as: 'waterBody',
      attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName'],
      required: false,
    },
    {
      model: Region,
      as: 'region',
      attributes: ['regionId', 'regionName', 'regionCode'],
      required: false,
    },
  ];

  const options: FindOptions = {
    where,
    include,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['complaintTime', 'DESC']],
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser, 'regionId');
  const { rows, count } = await ComplaintOrder.findAndCountAll(filteredOptions);

  return {
    rows: rows.map(r => r.toJSON()),
    count,
  };
};

export const getComplaintById = async (
  complaintId: number,
  currentUser: IUserAttributes
): Promise<IComplaintOrderAttributes | null> => {
  const options: FindOptions = {
    where: { complaintId },
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName'],
        required: false,
      },
      {
        model: Region,
        as: 'region',
        attributes: ['regionId', 'regionName', 'regionCode'],
        required: false,
      },
    ],
  };

  const complaint = await ComplaintOrder.findOne(options);
  return complaint ? complaint.toJSON() : null;
};

const generateComplaintCode = async (): Promise<string> => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const lastComplaint = await ComplaintOrder.findOne({
    where: {
      complaintCode: {
        [Op.like]: `TS${yearMonth}%`,
      },
    },
    order: [['complaintCode', 'DESC']],
  });

  let sequence = 1;
  if (lastComplaint) {
    const lastCode = lastComplaint.complaintCode;
    const lastSequence = parseInt(lastCode.slice(-4));
    sequence = lastSequence + 1;
  }

  return `TS${yearMonth}${String(sequence).padStart(4, '0')}`;
};

export const createComplaint = async (
  data: IComplaintOrderCreationAttributes,
  currentUser: IUserAttributes
): Promise<IComplaintOrderAttributes> => {
  if (!data.complaintCode) {
    data.complaintCode = await generateComplaintCode();
  }

  if (!data.priority) {
    data.priority = calculatePriority(data.complaintType, data.complaintContent);
  }

  if (!data.hotKeywords || data.hotKeywords.length === 0) {
    data.hotKeywords = extractHotKeywords(data.complaintContent);
  }

  data.orderStatus = OrderStatus.PENDING_ACCEPTANCE;

  const created = await ComplaintOrder.create(data);

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_complaint',
    'complaint',
    `创建投诉工单: ${data.complaintCode}`,
    { complaintId: created.complaintId, complaintCode: data.complaintCode }
  );

  return created.toJSON();
};

export const updateComplaint = async (
  complaintId: number,
  data: Partial<IComplaintOrderAttributes>,
  currentUser: IUserAttributes
): Promise<IComplaintOrderAttributes | null> => {
  const existing = await ComplaintOrder.findByPk(complaintId);
  if (!existing) {
    return null;
  }

  if (data.complaintContent) {
    data.hotKeywords = extractHotKeywords(data.complaintContent);
  }

  if (data.complaintType && data.complaintContent && !data.priority) {
    data.priority = calculatePriority(data.complaintType, data.complaintContent);
  }

  await ComplaintOrder.update(data, { where: { complaintId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_complaint',
    'complaint',
    `更新投诉工单: ${existing.complaintCode}`,
    { complaintId, ...data }
  );

  const updated = await ComplaintOrder.findByPk(complaintId);
  return updated ? updated.toJSON() : null;
};

export const deleteComplaint = async (
  complaintId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const existing = await ComplaintOrder.findByPk(complaintId);
  if (!existing) {
    return false;
  }

  await ComplaintOrder.destroy({ where: { complaintId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_complaint',
    'complaint',
    `删除投诉工单: ${existing.complaintCode}`,
    { complaintId, complaintCode: existing.complaintCode }
  );

  return true;
};

export const acceptComplaint = async (
  complaintId: number,
  handlerUnit: string,
  handlerPerson: string,
  deadline: string,
  currentUser: IUserAttributes
): Promise<IComplaintOrderAttributes | null> => {
  const existing = await ComplaintOrder.findByPk(complaintId);
  if (!existing) {
    return null;
  }

  if (existing.orderStatus !== OrderStatus.PENDING_ACCEPTANCE) {
    throw new Error('只有待受理状态的工单可以受理');
  }

  await ComplaintOrder.update(
    {
      orderStatus: OrderStatus.PROCESSING,
      handlerUnit,
      handlerPerson,
      deadline: new Date(deadline),
      acceptTime: new Date(),
    },
    { where: { complaintId } }
  );

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'accept_complaint',
    'complaint',
    `受理投诉工单: ${existing.complaintCode}`,
    { complaintId, handlerUnit, handlerPerson, deadline }
  );

  const updated = await ComplaintOrder.findByPk(complaintId);
  return updated ? updated.toJSON() : null;
};

export const processComplaint = async (
  complaintId: number,
  processResult: string,
  currentUser: IUserAttributes
): Promise<IComplaintOrderAttributes | null> => {
  const existing = await ComplaintOrder.findByPk(complaintId);
  if (!existing) {
    return null;
  }

  if (existing.orderStatus !== OrderStatus.PROCESSING) {
    throw new Error('只有处理中状态的工单可以处理完成');
  }

  await ComplaintOrder.update(
    {
      orderStatus: OrderStatus.PROCESSED,
      processResult,
      processEndTime: new Date(),
    },
    { where: { complaintId } }
  );

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'process_complaint',
    'complaint',
    `处理完成投诉工单: ${existing.complaintCode}`,
    { complaintId, processResult }
  );

  const updated = await ComplaintOrder.findByPk(complaintId);
  return updated ? updated.toJSON() : null;
};

export const followUpComplaint = async (
  complaintId: number,
  satisfactionScore: number,
  satisfactionFeedback: string,
  currentUser: IUserAttributes
): Promise<IComplaintOrderAttributes | null> => {
  const existing = await ComplaintOrder.findByPk(complaintId);
  if (!existing) {
    return null;
  }

  if (existing.orderStatus !== OrderStatus.PROCESSED) {
    throw new Error('只有已处理状态的工单可以回访');
  }

  if (satisfactionScore < 1 || satisfactionScore > 5) {
    throw new Error('满意度评分应在1-5之间');
  }

  await ComplaintOrder.update(
    {
      orderStatus: OrderStatus.FOLLOWED_UP,
      satisfactionScore,
      satisfactionFeedback,
      reviewTime: new Date(),
    },
    { where: { complaintId } }
  );

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'follow_up_complaint',
    'complaint',
    `回访投诉工单: ${existing.complaintCode}`,
    { complaintId, satisfactionScore, satisfactionFeedback }
  );

  const updated = await ComplaintOrder.findByPk(complaintId);
  return updated ? updated.toJSON() : null;
};

export const closeComplaint = async (
  complaintId: number,
  currentUser: IUserAttributes
): Promise<IComplaintOrderAttributes | null> => {
  const existing = await ComplaintOrder.findByPk(complaintId);
  if (!existing) {
    return null;
  }

  if (existing.orderStatus !== OrderStatus.FOLLOWED_UP) {
    throw new Error('只有已回访状态的工单可以结案');
  }

  await ComplaintOrder.update(
    { orderStatus: OrderStatus.CLOSED },
    { where: { complaintId } }
  );

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'close_complaint',
    'complaint',
    `结案投诉工单: ${existing.complaintCode}`,
    { complaintId }
  );

  const updated = await ComplaintOrder.findByPk(complaintId);
  return updated ? updated.toJSON() : null;
};

export const getComplaintStatistics = async (
  query: IComplaintStatsQuery,
  currentUser: IUserAttributes
): Promise<any> => {
  const { regionId, waterBodyId, startTime, endTime, groupBy = 'complaintType' } = query;

  const where: any = {};

  if (regionId) {
    where.regionId = regionId;
  }
  if (waterBodyId) {
    where.waterBodyId = waterBodyId;
  }
  if (startTime) {
    where.complaintTime = { [Op.gte]: new Date(startTime) };
  }
  if (endTime) {
    where.complaintTime = { ...where.complaintTime, [Op.lte]: new Date(endTime) };
  }

  const totalCount = await ComplaintOrder.count({ where });
  const pendingCount = await ComplaintOrder.count({ where: { ...where, orderStatus: OrderStatus.PENDING_ACCEPTANCE } });
  const processingCount = await ComplaintOrder.count({ where: { ...where, orderStatus: OrderStatus.PROCESSING } });
  const closedCount = await ComplaintOrder.count({ where: { ...where, orderStatus: OrderStatus.CLOSED } });

  const avgSatisfactionResult = await ComplaintOrder.findOne({
    where: { ...where, satisfactionScore: { [Op.ne]: null } },
    attributes: [[fn('AVG', col('satisfaction_score')), 'avgSatisfaction']],
    raw: true,
  });

  let groupStats: any[] = [];

  if (groupBy === 'complaintType') {
    groupStats = await ComplaintOrder.findAll({
      where,
      attributes: [
        'complaintType',
        [fn('COUNT', col('complaint_id')), 'count'],
      ],
      group: ['complaintType'],
      raw: true,
    });
  } else if (groupBy === 'orderStatus') {
    groupStats = await ComplaintOrder.findAll({
      where,
      attributes: [
        'orderStatus',
        [fn('COUNT', col('complaint_id')), 'count'],
      ],
      group: ['orderStatus'],
      raw: true,
    });
  } else if (groupBy === 'region') {
    groupStats = await ComplaintOrder.findAll({
      where,
      include: [
        {
          model: Region,
          as: 'region',
          attributes: ['regionId', 'regionName'],
        },
      ],
      attributes: [
        [col('region.region_id'), 'regionId'],
        [col('region.region_name'), 'regionName'],
        [fn('COUNT', col('complaint_id')), 'count'],
      ],
      group: ['region.region_id', 'region.region_name'],
      raw: true,
    });
  } else if (groupBy === 'month') {
    groupStats = await ComplaintOrder.findAll({
      where,
      attributes: [
        [fn('TO_CHAR', col('complaint_time'), 'YYYY-MM'), 'month'],
        [fn('COUNT', col('complaint_id')), 'count'],
      ],
      group: [fn('TO_CHAR', col('complaint_time'), 'YYYY-MM')],
      order: [fn('TO_CHAR', col('complaint_time'), 'YYYY-MM')],
      raw: true,
    });
  }

  const closedWithSatisfaction = await ComplaintOrder.count({
    where: { ...where, orderStatus: OrderStatus.CLOSED, satisfactionScore: { [Op.ne]: null } },
  });

  return {
    totalCount,
    pendingCount,
    processingCount,
    closedCount,
    avgSatisfaction: avgSatisfactionResult ? parseFloat((avgSatisfactionResult as any).avgSatisfaction || 0) : 0,
    satisfactionRate: closedWithSatisfaction > 0 ? Math.round((closedWithSatisfaction / closedCount) * 10000) / 100 : 0,
    groupStats,
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
  getComplaintList,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  acceptComplaint,
  processComplaint,
  followUpComplaint,
  closeComplaint,
  getComplaintStatistics,
};
