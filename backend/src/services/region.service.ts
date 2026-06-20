import { Op, FindOptions, literal, fn, col } from 'sequelize';
import { Region, IRegionAttributes, IRegionCreationAttributes } from '../models/Region';
import { WaterBody } from '../models/WaterBody';
import { SewageOutlet } from '../models/SewageOutlet';
import { GovernanceProject } from '../models/GovernanceProject';
import { ComplaintOrder } from '../models/ComplaintOrder';
import { OperationLog } from '../models/OperationLog';
import { IUserAttributes } from '../models/User';
import { RegionLevel, WaterBodyStatus, ProjectStatus, OrderStatus } from '../models/enums';
import { applyDataPermissionFilter, clearAllRegionCache } from './permission.service';

export interface IRegionQuery {
  page?: number;
  pageSize?: number;
  regionCode?: string;
  regionName?: string;
  regionLevel?: RegionLevel;
  parentId?: number;
  isActive?: boolean;
}

export interface IRegionStatsQuery {
  regionId?: number;
  startTime?: string;
  endTime?: string;
}

interface ITreeNode extends IRegionAttributes {
  children?: ITreeNode[];
}

const buildTree = (regions: IRegionAttributes[], parentId?: number): ITreeNode[] => {
  return regions
    .filter(r => r.parentId === parentId)
    .map(r => ({
      ...r,
      children: buildTree(regions, r.regionId),
    }))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
};

export const getRegionList = async (
  query: IRegionQuery,
  currentUser: IUserAttributes
): Promise<{ rows: IRegionAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    regionCode,
    regionName,
    regionLevel,
    parentId,
    isActive,
  } = query;

  const where: any = {};

  if (regionCode) {
    where.regionCode = { [Op.like]: `%${regionCode}%` };
  }
  if (regionName) {
    where.regionName = { [Op.like]: `%${regionName}%` };
  }
  if (regionLevel !== undefined) {
    where.regionLevel = regionLevel;
  }
  if (parentId !== undefined) {
    where.parentId = parentId;
  }
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['regionLevel', 'ASC'], ['sortOrder', 'ASC'], ['regionCode', 'ASC']],
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser);
  const { rows, count } = await Region.findAndCountAll(filteredOptions);

  return {
    rows: rows.map(r => r.toJSON()),
    count,
  };
};

export const getRegionTree = async (
  currentUser: IUserAttributes
): Promise<ITreeNode[]> => {
  const options: FindOptions = {
    where: { isActive: true },
    order: [['regionLevel', 'ASC'], ['sortOrder', 'ASC'], ['regionCode', 'ASC']],
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser);
  const regions = await Region.findAll(filteredOptions);
  const regionData = regions.map(r => r.toJSON());

  return buildTree(regionData);
};

export const getRegionById = async (
  regionId: number,
  currentUser: IUserAttributes
): Promise<IRegionAttributes | null> => {
  const options: FindOptions = {
    where: { regionId },
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser);
  const region = await Region.findOne(filteredOptions);
  return region ? region.toJSON() : null;
};

export const createRegion = async (
  data: IRegionCreationAttributes,
  currentUser: IUserAttributes
): Promise<IRegionAttributes> => {
  if (data.parentId) {
    const parentRegion = await Region.findByPk(data.parentId);
    if (!parentRegion) {
      throw new Error('父级区域不存在');
    }
    if (parentRegion.regionLevel === RegionLevel.MUNICIPAL) {
      throw new Error('市级区域不能有子区域');
    }
    if (data.regionLevel !== parentRegion.regionLevel + 1) {
      throw new Error('区域级别必须是父级区域的下一级');
    }
  }

  const existingRegion = await Region.findOne({ where: { regionCode: data.regionCode } });
  if (existingRegion) {
    throw new Error('区域编码已存在');
  }

  const created = await Region.create(data);

  await clearAllRegionCache();

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_region',
    'region',
    `创建区域: ${data.regionName}`,
    { regionId: created.regionId, regionCode: data.regionCode }
  );

  return created.toJSON();
};

export const updateRegion = async (
  regionId: number,
  data: Partial<IRegionAttributes>,
  currentUser: IUserAttributes
): Promise<IRegionAttributes | null> => {
  const existing = await Region.findByPk(regionId);
  if (!existing) {
    return null;
  }

  if (data.parentId !== undefined && data.parentId !== existing.parentId) {
    if (data.parentId) {
      const parentRegion = await Region.findByPk(data.parentId);
      if (!parentRegion) {
        throw new Error('父级区域不存在');
      }
      if (parentRegion.regionLevel === RegionLevel.MUNICIPAL) {
        throw new Error('市级区域不能有子区域');
      }
    }
  }

  if (data.regionCode && data.regionCode !== existing.regionCode) {
    const existingRegion = await Region.findOne({ where: { regionCode: data.regionCode } });
    if (existingRegion) {
      throw new Error('区域编码已存在');
    }
  }

  await Region.update(data, { where: { regionId } });

  await clearAllRegionCache();

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_region',
    'region',
    `更新区域: ${existing.regionName}`,
    { regionId, ...data }
  );

  const updated = await Region.findByPk(regionId);
  return updated ? updated.toJSON() : null;
};

export const deleteRegion = async (
  regionId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const existing = await Region.findByPk(regionId);
  if (!existing) {
    return false;
  }

  const childCount = await Region.count({ where: { parentId: regionId } });
  if (childCount > 0) {
    throw new Error('该区域下存在子区域，无法删除');
  }

  const waterBodyCount = await WaterBody.count({ where: { regionId } });
  if (waterBodyCount > 0) {
    throw new Error('该区域下存在水体，无法删除');
  }

  await Region.destroy({ where: { regionId } });

  await clearAllRegionCache();

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_region',
    'region',
    `删除区域: ${existing.regionName}`,
    { regionId, regionCode: existing.regionCode }
  );

  return true;
};

export const toggleRegionStatus = async (
  regionId: number,
  isActive: boolean,
  currentUser: IUserAttributes
): Promise<IRegionAttributes | null> => {
  const existing = await Region.findByPk(regionId);
  if (!existing) {
    return null;
  }

  if (!isActive) {
    const childCount = await Region.count({ where: { parentId: regionId, isActive: true } });
    if (childCount > 0) {
      throw new Error('该区域下存在启用的子区域，请先禁用子区域');
    }
  }

  await Region.update({ isActive }, { where: { regionId } });

  await clearAllRegionCache();

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    isActive ? 'enable_region' : 'disable_region',
    'region',
    `${isActive ? '启用' : '禁用'}区域: ${existing.regionName}`,
    { regionId, isActive }
  );

  const updated = await Region.findByPk(regionId);
  return updated ? updated.toJSON() : null;
};

export const getRegionStatistics = async (
  query: IRegionStatsQuery,
  currentUser: IUserAttributes
): Promise<any> => {
  const { regionId, startTime, endTime } = query;

  const where: any = {};
  if (regionId) {
    where.regionId = regionId;
  }

  const waterBodyTotal = await WaterBody.count({ where: { ...where, isActive: true } });
  const waterBodyCompleted = await WaterBody.count({
    where: { ...where, isActive: true, currentStatus: WaterBodyStatus.COMPLETED },
  });

  const outletTotal = await SewageOutlet.count({
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: [],
        where: { ...where, isActive: true },
      },
    ],
    where: { isActive: true },
  });

  const projectTotal = await GovernanceProject.count({
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: [],
        where: { ...where, isActive: true },
      },
    ],
  });
  const projectCompleted = await GovernanceProject.count({
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: [],
        where: { ...where, isActive: true },
      },
    ],
    where: { projectStatus: ProjectStatus.COMPLETED },
  });
  const projectDelayed = await GovernanceProject.count({
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: [],
        where: { ...where, isActive: true },
      },
    ],
    where: { projectStatus: ProjectStatus.DELAYED },
  });

  const complaintWhere: any = { ...where };
  if (startTime) {
    complaintWhere.complaintTime = { [Op.gte]: new Date(startTime) };
  }
  if (endTime) {
    complaintWhere.complaintTime = { ...complaintWhere.complaintTime, [Op.lte]: new Date(endTime) };
  }

  const complaintTotal = await ComplaintOrder.count({ where: complaintWhere });
  const complaintClosed = await ComplaintOrder.count({
    where: { ...complaintWhere, orderStatus: OrderStatus.CLOSED },
  });

  const avgSatisfactionResult = await ComplaintOrder.findOne({
    where: { ...complaintWhere, satisfactionScore: { [Op.ne]: null } },
    attributes: [[fn('AVG', col('satisfaction_score')), 'avgSatisfaction']],
    raw: true,
  });

  return {
    waterBody: {
      total: waterBodyTotal,
      completed: waterBodyCompleted,
      completionRate: waterBodyTotal > 0 ? Math.round((waterBodyCompleted / waterBodyTotal) * 10000) / 100 : 0,
    },
    sewageOutlet: {
      total: outletTotal,
    },
    governanceProject: {
      total: projectTotal,
      completed: projectCompleted,
      delayed: projectDelayed,
      completionRate: projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 10000) / 100 : 0,
      delayRate: projectTotal > 0 ? Math.round((projectDelayed / projectTotal) * 10000) / 100 : 0,
    },
    complaint: {
      total: complaintTotal,
      closed: complaintClosed,
      closingRate: complaintTotal > 0 ? Math.round((complaintClosed / complaintTotal) * 10000) / 100 : 0,
      avgSatisfaction: avgSatisfactionResult ? parseFloat((avgSatisfactionResult as any).avgSatisfaction || 0) : 0,
    },
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
  getRegionList,
  getRegionTree,
  getRegionById,
  createRegion,
  updateRegion,
  deleteRegion,
  toggleRegionStatus,
  getRegionStatistics,
};
