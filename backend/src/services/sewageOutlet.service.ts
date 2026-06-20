import { Op, FindOptions, literal, fn, col } from 'sequelize';
import { SewageOutlet, ISewageOutletAttributes, ISewageOutletCreationAttributes } from '../models/SewageOutlet';
import { WaterBody } from '../models/WaterBody';
import { Region } from '../models/Region';
import { OperationLog } from '../models/OperationLog';
import { IUserAttributes } from '../models/User';
import { OutletType } from '../models/enums';

export interface ISewageOutletQuery {
  page?: number;
  pageSize?: number;
  outletCode?: string;
  outletName?: string;
  waterBodyId?: number;
  regionId?: number;
  outletType?: OutletType;
  isMonitored?: boolean;
  isActive?: boolean;
}

export interface INearbyQuery {
  longitude: number;
  latitude: number;
  radius: number;
  outletType?: OutletType;
  isActive?: boolean;
}

export const getSewageOutletList = async (
  query: ISewageOutletQuery,
  currentUser: IUserAttributes
): Promise<{ rows: ISewageOutletAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    outletCode,
    outletName,
    waterBodyId,
    regionId,
    outletType,
    isMonitored,
    isActive,
  } = query;

  const where: any = {};

  if (outletCode) {
    where.outletCode = { [Op.like]: `%${outletCode}%` };
  }
  if (outletName) {
    where.outletName = { [Op.like]: `%${outletName}%` };
  }
  if (waterBodyId) {
    where.waterBodyId = waterBodyId;
  }
  if (outletType !== undefined) {
    where.outletType = outletType;
  }
  if (isMonitored !== undefined) {
    where.isMonitored = isMonitored;
  }
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const include: any[] = [
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

  const { rows, count } = await SewageOutlet.findAndCountAll(options);

  return {
    rows: rows.map(r => r.toJSON()),
    count,
  };
};

export const getSewageOutletById = async (
  outletId: number,
  currentUser: IUserAttributes
): Promise<ISewageOutletAttributes | null> => {
  const options: FindOptions = {
    where: { outletId },
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
  };

  const outlet = await SewageOutlet.findOne(options);
  return outlet ? outlet.toJSON() : null;
};

export const createSewageOutlet = async (
  data: ISewageOutletCreationAttributes,
  currentUser: IUserAttributes
): Promise<ISewageOutletAttributes> => {
  const waterBody = await WaterBody.findByPk(data.waterBodyId);
  if (!waterBody) {
    throw new Error('水体不存在');
  }

  const existingOutlet = await SewageOutlet.findOne({ where: { outletCode: data.outletCode } });
  if (existingOutlet) {
    throw new Error('排污口编号已存在');
  }

  const created = await SewageOutlet.create(data);

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_sewage_outlet',
    'sewage_outlet',
    `创建排污口: ${data.outletName}`,
    { outletId: created.outletId, outletCode: data.outletCode }
  );

  return created.toJSON();
};

export const updateSewageOutlet = async (
  outletId: number,
  data: Partial<ISewageOutletAttributes>,
  currentUser: IUserAttributes
): Promise<ISewageOutletAttributes | null> => {
  const existing = await SewageOutlet.findByPk(outletId);
  if (!existing) {
    return null;
  }

  if (data.waterBodyId !== undefined && data.waterBodyId !== existing.waterBodyId) {
    const waterBody = await WaterBody.findByPk(data.waterBodyId);
    if (!waterBody) {
      throw new Error('水体不存在');
    }
  }

  if (data.outletCode && data.outletCode !== existing.outletCode) {
    const existingOutlet = await SewageOutlet.findOne({ where: { outletCode: data.outletCode } });
    if (existingOutlet) {
      throw new Error('排污口编号已存在');
    }
  }

  await SewageOutlet.update(data, { where: { outletId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_sewage_outlet',
    'sewage_outlet',
    `更新排污口: ${existing.outletName}`,
    { outletId, ...data }
  );

  const updated = await SewageOutlet.findByPk(outletId);
  return updated ? updated.toJSON() : null;
};

export const deleteSewageOutlet = async (
  outletId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const existing = await SewageOutlet.findByPk(outletId);
  if (!existing) {
    return false;
  }

  await SewageOutlet.destroy({ where: { outletId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_sewage_outlet',
    'sewage_outlet',
    `删除排污口: ${existing.outletName}`,
    { outletId, outletCode: existing.outletCode }
  );

  return true;
};

export const toggleOutletStatus = async (
  outletId: number,
  isActive: boolean,
  currentUser: IUserAttributes
): Promise<ISewageOutletAttributes | null> => {
  const existing = await SewageOutlet.findByPk(outletId);
  if (!existing) {
    return null;
  }

  await SewageOutlet.update({ isActive }, { where: { outletId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    isActive ? 'enable_sewage_outlet' : 'disable_sewage_outlet',
    'sewage_outlet',
    `${isActive ? '启用' : '禁用'}排污口: ${existing.outletName}`,
    { outletId, isActive }
  );

  const updated = await SewageOutlet.findByPk(outletId);
  return updated ? updated.toJSON() : null;
};

export const getNearbyOutlets = async (
  query: INearbyQuery,
  currentUser: IUserAttributes
): Promise<ISewageOutletAttributes[]> => {
  const { longitude, latitude, radius, outletType, isActive = true } = query;

  const where: any = { isActive };
  if (outletType !== undefined) {
    where.outletType = outletType;
  }

  const distanceExpression = literal(
    `ST_Distance(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography)`
  );

  const results = await SewageOutlet.findAll({
    where: {
      ...where,
      [Op.and]: literal(`ST_DWithin(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radius})`),
    } as any,
    attributes: {
      include: [[distanceExpression, 'distance']],
    },
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName'],
        include: [
          {
            model: Region,
            as: 'region',
            attributes: ['regionId', 'regionName'],
          },
        ],
      },
    ],
    order: [distanceExpression, 'ASC'],
  });

  return results.map(r => r.toJSON());
};

export const getOutletsByRegion = async (
  regionId: number,
  currentUser: IUserAttributes
): Promise<ISewageOutletAttributes[]> => {
  const results = await SewageOutlet.findAll({
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: [],
        where: { regionId },
        include: [],
      },
    ],
    where: { isActive: true },
    order: [['outletCode', 'ASC']],
  });

  return results.map(r => r.toJSON());
};

export const getOutletsByWaterBody = async (
  waterBodyId: number,
  currentUser: IUserAttributes
): Promise<ISewageOutletAttributes[]> => {
  const results = await SewageOutlet.findAll({
    where: { waterBodyId, isActive: true },
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName'],
      },
    ],
    order: [['outletCode', 'ASC']],
  });

  return results.map(r => r.toJSON());
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
  getSewageOutletList,
  getSewageOutletById,
  createSewageOutlet,
  updateSewageOutlet,
  deleteSewageOutlet,
  toggleOutletStatus,
  getNearbyOutlets,
  getOutletsByRegion,
  getOutletsByWaterBody,
};
