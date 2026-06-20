import { Op, FindOptions, literal, fn, col } from 'sequelize';
import { WaterQualityData, IWaterQualityDataAttributes, IWaterQualityDataCreationAttributes } from '../models/WaterQualityData';
import { SewageOutlet } from '../models/SewageOutlet';
import { WaterBody } from '../models/WaterBody';
import { Region } from '../models/Region';
import { OperationLog } from '../models/OperationLog';
import { DataQuality, GovernanceStage } from '../models/enums';
import { IUserAttributes } from '../models/User';
import { applyDataPermissionFilter } from './permission.service';

const NH3N_STANDARD = 8.0;
const TP_STANDARD = 0.4;

export interface IWaterQualityQuery {
  page?: number;
  pageSize?: number;
  outletId?: number;
  waterBodyId?: number;
  regionId?: number;
  governanceStage?: GovernanceStage;
  startTime?: string;
  endTime?: string;
  isCompliant?: boolean;
  isNh3nOverproof?: boolean;
  isTpOverproof?: boolean;
  dataQuality?: DataQuality;
}

export interface IWaterQualityTrendQuery {
  outletId?: number;
  waterBodyId?: number;
  regionId?: number;
  startTime: string;
  endTime: string;
  period?: 'day' | 'week' | 'month';
}

export interface IAggregationQuery {
  groupBy: 'waterBody' | 'region' | 'governanceStage';
  waterBodyId?: number;
  regionId?: number;
  governanceStage?: GovernanceStage;
  startTime?: string;
  endTime?: string;
}

export interface IBatchImportResult {
  success: number;
  failed: number;
  errors: string[];
  data: IWaterQualityDataAttributes[];
}

const validateWaterQualityData = (data: Partial<IWaterQualityDataAttributes>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.outletId) {
    errors.push('排污口ID不能为空');
  }
  if (!data.monitorTime) {
    errors.push('监测时间不能为空');
  }
  if (data.phValue !== undefined && (data.phValue < 0 || data.phValue > 14)) {
    errors.push('pH值应在0-14之间');
  }
  if (data.dissolvedOxygen !== undefined && data.dissolvedOxygen < 0) {
    errors.push('溶解氧不能为负数');
  }
  if (data.ammoniaNitrogen !== undefined && data.ammoniaNitrogen < 0) {
    errors.push('氨氮不能为负数');
  }
  if (data.totalPhosphorus !== undefined && data.totalPhosphorus < 0) {
    errors.push('总磷不能为负数');
  }
  if (data.cod !== undefined && data.cod < 0) {
    errors.push('COD不能为负数');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const calculateOverproofStatus = (data: Partial<IWaterQualityDataAttributes>, outlet?: SewageOutlet | null): void => {
  const nh3nLimit = outlet?.nh3nLimit ?? NH3N_STANDARD;
  const tpLimit = outlet?.tpLimit ?? TP_STANDARD;

  if (data.ammoniaNitrogen !== undefined) {
    data.isNh3nOverproof = data.ammoniaNitrogen > nh3nLimit;
  }

  if (data.totalPhosphorus !== undefined) {
    data.isTpOverproof = data.totalPhosphorus > tpLimit;
  }

  data.isCompliant = !(data.isNh3nOverproof || data.isTpOverproof);
};

export const getWaterQualityList = async (
  query: IWaterQualityQuery,
  currentUser: IUserAttributes
): Promise<{ rows: IWaterQualityDataAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    outletId,
    waterBodyId,
    regionId,
    governanceStage,
    startTime,
    endTime,
    isCompliant,
    isNh3nOverproof,
    isTpOverproof,
    dataQuality,
  } = query;

  const where: any = {};

  if (outletId) {
    where.outletId = outletId;
  }
  if (startTime) {
    where.monitorTime = { [Op.gte]: new Date(startTime) };
  }
  if (endTime) {
    where.monitorTime = { ...where.monitorTime, [Op.lte]: new Date(endTime) };
  }
  if (isCompliant !== undefined) {
    where.isCompliant = isCompliant;
  }
  if (isNh3nOverproof !== undefined) {
    where.isNh3nOverproof = isNh3nOverproof;
  }
  if (isTpOverproof !== undefined) {
    where.isTpOverproof = isTpOverproof;
  }
  if (dataQuality !== undefined) {
    where.dataQuality = dataQuality;
  }

  const include: any[] = [
    {
      model: SewageOutlet,
      as: 'outlet',
      attributes: ['outletId', 'outletCode', 'outletName', 'nh3nLimit', 'tpLimit'],
      include: [
        {
          model: WaterBody,
          as: 'waterBody',
          attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName', 'governanceStage'],
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
  ];

  if (waterBodyId) {
    (include[0].include[0] as any).where = { waterBodyId };
  }

  if (regionId) {
    (include[0].include[0].include[0] as any).where = { regionId };
  }

  if (governanceStage !== undefined) {
    (include[0].include[0] as any).where = {
      ...((include[0].include[0] as any).where || {}),
      governanceStage,
    };
  }

  const options: FindOptions = {
    where,
    include,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['monitorTime', 'DESC']],
  };

  const { rows, count } = await WaterQualityData.findAndCountAll(options);

  return {
    rows: rows.map(r => r.toJSON()),
    count,
  };
};

export const getWaterQualityById = async (
  dataId: number,
  currentUser: IUserAttributes
): Promise<IWaterQualityDataAttributes | null> => {
  const options: FindOptions = {
    where: { dataId },
    include: [
      {
        model: SewageOutlet,
        as: 'outlet',
        attributes: ['outletId', 'outletCode', 'outletName', 'nh3nLimit', 'tpLimit'],
        include: [
          {
            model: WaterBody,
            as: 'waterBody',
            attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName', 'governanceStage'],
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
    ],
  };

  const data = await WaterQualityData.findOne(options);
  return data ? data.toJSON() : null;
};

export const batchImportWaterQuality = async (
  dataList: Partial<IWaterQualityDataCreationAttributes>[],
  currentUser: IUserAttributes
): Promise<IBatchImportResult> => {
  const result: IBatchImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    data: [],
  };

  const transaction = await WaterQualityData.sequelize!.transaction();

  try {
    for (let i = 0; i < dataList.length; i++) {
      const item = dataList[i];

      const validation = validateWaterQualityData(item);
      if (!validation.valid) {
        result.failed++;
        result.errors.push(`第${i + 1}条数据: ${validation.errors.join(', ')}`);
        continue;
      }

      const outlet = await SewageOutlet.findByPk(item.outletId, { transaction });
      if (!outlet) {
        result.failed++;
        result.errors.push(`第${i + 1}条数据: 排污口不存在`);
        continue;
      }

      calculateOverproofStatus(item, outlet);

      const existingData = await WaterQualityData.findOne({
        where: {
          outletId: item.outletId,
          monitorTime: item.monitorTime,
        },
        transaction,
      });

      if (existingData) {
        result.failed++;
        result.errors.push(`第${i + 1}条数据: 该排污口此时间点数据已存在`);
        continue;
      }

      item.dataQuality = DataQuality.VALID;
      item.rawData = { ...item };

      const created = await WaterQualityData.create(item as IWaterQualityDataCreationAttributes, { transaction });
      result.success++;
      result.data.push(created.toJSON());
    }

    await transaction.commit();

    await recordOperationLog(
      currentUser.userId,
      currentUser.username,
      'batch_import_water_quality',
      'water_quality',
      `批量导入水质数据，成功${result.success}条，失败${result.failed}条`,
      { success: result.success, failed: result.failed }
    );

    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const createWaterQuality = async (
  data: IWaterQualityDataCreationAttributes,
  currentUser: IUserAttributes
): Promise<IWaterQualityDataAttributes> => {
  const validation = validateWaterQualityData(data);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  const outlet = await SewageOutlet.findByPk(data.outletId);
  if (!outlet) {
    throw new Error('排污口不存在');
  }

  calculateOverproofStatus(data, outlet);

  data.dataQuality = DataQuality.VALID;
  data.rawData = { ...data };

  const created = await WaterQualityData.create(data);

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_water_quality',
    'water_quality',
    `创建水质数据: 排污口${data.outletId}`,
    { dataId: created.dataId }
  );

  return created.toJSON();
};

export const updateWaterQuality = async (
  dataId: number,
  data: Partial<IWaterQualityDataAttributes>,
  currentUser: IUserAttributes
): Promise<IWaterQualityDataAttributes | null> => {
  const existing = await WaterQualityData.findByPk(dataId);
  if (!existing) {
    return null;
  }

  const validation = validateWaterQualityData({ ...existing.toJSON(), ...data });
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  const outlet = await SewageOutlet.findByPk(data.outletId || existing.outletId);
  calculateOverproofStatus(data, outlet);

  data.dataQuality = DataQuality.REVISED;

  await WaterQualityData.update(data, { where: { dataId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_water_quality',
    'water_quality',
    `更新水质数据: ${dataId}`,
    { dataId, ...data }
  );

  const updated = await WaterQualityData.findByPk(dataId);
  return updated ? updated.toJSON() : null;
};

export const deleteWaterQuality = async (
  dataId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const existing = await WaterQualityData.findByPk(dataId);
  if (!existing) {
    return false;
  }

  await WaterQualityData.destroy({ where: { dataId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_water_quality',
    'water_quality',
    `删除水质数据: ${dataId}`,
    { dataId }
  );

  return true;
};

export const getWaterQualityTrend = async (
  query: IWaterQualityTrendQuery,
  currentUser: IUserAttributes
): Promise<any[]> => {
  const { outletId, waterBodyId, regionId, startTime, endTime, period = 'day' } = query;

  const where: any = {
    monitorTime: {
      [Op.between]: [new Date(startTime), new Date(endTime)],
    },
  };

  const include: any[] = [
    {
      model: SewageOutlet,
      as: 'outlet',
      attributes: [],
      include: [
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
      ],
    },
  ];

  if (outletId) {
    where.outletId = outletId;
  }
  if (waterBodyId) {
    (include[0].include[0] as any).where = { waterBodyId };
  }
  if (regionId) {
    (include[0].include[0].include[0] as any).where = { regionId };
  }

  let dateFormat: string;
  switch (period) {
    case 'week':
      dateFormat = 'YYYY-ww';
      break;
    case 'month':
      dateFormat = 'YYYY-MM';
      break;
    default:
      dateFormat = 'YYYY-MM-DD';
  }

  const results = await WaterQualityData.findAll({
    where,
    include,
    attributes: [
      [fn('TO_CHAR', col('monitor_time'), dateFormat), 'period'],
      [fn('AVG', col('ammonia_nitrogen')), 'avgAmmoniaNitrogen'],
      [fn('AVG', col('total_phosphorus')), 'avgTotalPhosphorus'],
      [fn('AVG', col('cod')), 'avgCod'],
      [fn('AVG', col('dissolved_oxygen')), 'avgDissolvedOxygen'],
      [fn('COUNT', col('data_id')), 'dataCount'],
      [fn('SUM', literal('CASE WHEN is_compliant = true THEN 1 ELSE 0 END')), 'compliantCount'],
    ],
    group: [fn('TO_CHAR', col('monitor_time'), dateFormat)],
    order: [fn('TO_CHAR', col('monitor_time'), dateFormat), 'ASC'],
    raw: true,
  });

  return results as any[];
};

export const getAggregatedData = async (
  query: IAggregationQuery,
  currentUser: IUserAttributes
): Promise<any[]> => {
  const { groupBy, waterBodyId, regionId, governanceStage, startTime, endTime } = query;

  const where: any = {};
  const include: any[] = [
    {
      model: SewageOutlet,
      as: 'outlet',
      attributes: [],
      include: [
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
      ],
    },
  ];

  if (startTime) {
    where.monitorTime = { [Op.gte]: new Date(startTime) };
  }
  if (endTime) {
    where.monitorTime = { ...where.monitorTime, [Op.lte]: new Date(endTime) };
  }

  let groupAttributes: any[] = [];
  let attributes: any[] = [];

  switch (groupBy) {
    case 'waterBody':
      groupAttributes = [col('outlet.waterBody.water_body_id'), col('outlet.waterBody.water_body_name')];
      attributes = [
        [col('outlet.waterBody.water_body_id'), 'waterBodyId'],
        [col('outlet.waterBody.water_body_name'), 'waterBodyName'],
      ];
      if (waterBodyId) {
        (include[0].include[0] as any).where = { waterBodyId };
      }
      break;
    case 'region':
      groupAttributes = [col('outlet.waterBody.region.region_id'), col('outlet.waterBody.region.region_name')];
      attributes = [
        [col('outlet.waterBody.region.region_id'), 'regionId'],
        [col('outlet.waterBody.region.region_name'), 'regionName'],
      ];
      if (regionId) {
        (include[0].include[0].include[0] as any).where = { regionId };
      }
      break;
    case 'governanceStage':
      groupAttributes = [col('outlet.waterBody.governance_stage')];
      attributes = [[col('outlet.waterBody.governance_stage'), 'governanceStage']];
      if (governanceStage !== undefined) {
        (include[0].include[0] as any).where = { governanceStage };
      }
      break;
  }

  attributes = attributes.concat([
    [fn('COUNT', col('data_id')), 'totalCount'],
    [fn('SUM', literal('CASE WHEN is_compliant = true THEN 1 ELSE 0 END')), 'compliantCount'],
    [fn('AVG', col('ammonia_nitrogen')), 'avgAmmoniaNitrogen'],
    [fn('AVG', col('total_phosphorus')), 'avgTotalPhosphorus'],
    [fn('AVG', col('cod')), 'avgCod'],
  ]);

  const results = await WaterQualityData.findAll({
    where,
    include,
    attributes,
    group: groupAttributes,
    raw: true,
  });

  return results as any[];
};

export const exportWaterQuality = async (
  query: IWaterQualityQuery,
  currentUser: IUserAttributes
): Promise<IWaterQualityDataAttributes[]> => {
  const allQuery = { ...query, page: 1, pageSize: 10000 };
  const { rows } = await getWaterQualityList(allQuery, currentUser);
  return rows;
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
  getWaterQualityList,
  getWaterQualityById,
  batchImportWaterQuality,
  createWaterQuality,
  updateWaterQuality,
  deleteWaterQuality,
  getWaterQualityTrend,
  getAggregatedData,
  exportWaterQuality,
};
