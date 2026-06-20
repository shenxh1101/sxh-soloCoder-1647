import { Op, FindOptions } from 'sequelize';
import { WaterBody, IWaterBodyAttributes, IWaterBodyCreationAttributes } from '../models/WaterBody';
import { Region } from '../models/Region';
import { SewageOutlet } from '../models/SewageOutlet';
import { GovernanceProject } from '../models/GovernanceProject';
import { OperationLog } from '../models/OperationLog';
import { IUserAttributes } from '../models/User';
import { WaterBodyType, WaterBodyLevel, GovernanceStage, WaterBodyStatus } from '../models/enums';
import { applyDataPermissionFilter } from './permission.service';

export interface IWaterBodyQuery {
  page?: number;
  pageSize?: number;
  waterBodyCode?: string;
  waterBodyName?: string;
  waterBodyType?: WaterBodyType;
  waterBodyLevel?: WaterBodyLevel;
  regionId?: number;
  governanceStage?: GovernanceStage;
  currentStatus?: WaterBodyStatus;
  isActive?: boolean;
}

export const getWaterBodyList = async (
  query: IWaterBodyQuery,
  currentUser: IUserAttributes
): Promise<{ rows: IWaterBodyAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    waterBodyCode,
    waterBodyName,
    waterBodyType,
    waterBodyLevel,
    regionId,
    governanceStage,
    currentStatus,
    isActive,
  } = query;

  const where: any = {};

  if (waterBodyCode) {
    where.waterBodyCode = { [Op.like]: `%${waterBodyCode}%` };
  }
  if (waterBodyName) {
    where.waterBodyName = { [Op.like]: `%${waterBodyName}%` };
  }
  if (waterBodyType !== undefined) {
    where.waterBodyType = waterBodyType;
  }
  if (waterBodyLevel !== undefined) {
    where.waterBodyLevel = waterBodyLevel;
  }
  if (regionId) {
    where.regionId = regionId;
  }
  if (governanceStage !== undefined) {
    where.governanceStage = governanceStage;
  }
  if (currentStatus !== undefined) {
    where.currentStatus = currentStatus;
  }
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const options: FindOptions = {
    where,
    include: [
      {
        model: Region,
        as: 'region',
        attributes: ['regionId', 'regionName', 'regionCode'],
      },
    ],
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['createdAt', 'DESC']],
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser);
  const { rows, count } = await WaterBody.findAndCountAll(filteredOptions);

  return {
    rows: rows.map(r => r.toJSON()),
    count,
  };
};

export const getWaterBodyById = async (
  waterBodyId: number,
  currentUser: IUserAttributes
): Promise<IWaterBodyAttributes | null> => {
  const options: FindOptions = {
    where: { waterBodyId },
    include: [
      {
        model: Region,
        as: 'region',
        attributes: ['regionId', 'regionName', 'regionCode'],
      },
      {
        model: SewageOutlet,
        as: 'sewageOutlets',
        attributes: ['outletId', 'outletCode', 'outletName', 'outletType', 'isActive'],
        where: { isActive: true },
        required: false,
      },
      {
        model: GovernanceProject,
        as: 'governanceProjects',
        attributes: ['projectId', 'projectCode', 'projectName', 'projectType', 'projectStatus', 'actualProgress'],
        where: { isActive: true },
        required: false,
      },
    ],
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser);
  const waterBody = await WaterBody.findOne(filteredOptions);
  return waterBody ? waterBody.toJSON() : null;
};

export const createWaterBody = async (
  data: IWaterBodyCreationAttributes,
  currentUser: IUserAttributes
): Promise<IWaterBodyAttributes> => {
  const region = await Region.findByPk(data.regionId);
  if (!region) {
    throw new Error('区域不存在');
  }

  const existingWaterBody = await WaterBody.findOne({ where: { waterBodyCode: data.waterBodyCode } });
  if (existingWaterBody) {
    throw new Error('水体编号已存在');
  }

  const created = await WaterBody.create(data);

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_water_body',
    'water_body',
    `创建水体: ${data.waterBodyName}`,
    { waterBodyId: created.waterBodyId, waterBodyCode: data.waterBodyCode }
  );

  return created.toJSON();
};

export const updateWaterBody = async (
  waterBodyId: number,
  data: Partial<IWaterBodyAttributes>,
  currentUser: IUserAttributes
): Promise<IWaterBodyAttributes | null> => {
  const existing = await WaterBody.findByPk(waterBodyId);
  if (!existing) {
    return null;
  }

  if (data.regionId !== undefined && data.regionId !== existing.regionId) {
    const region = await Region.findByPk(data.regionId);
    if (!region) {
      throw new Error('区域不存在');
    }
  }

  if (data.waterBodyCode && data.waterBodyCode !== existing.waterBodyCode) {
    const existingWaterBody = await WaterBody.findOne({ where: { waterBodyCode: data.waterBodyCode } });
    if (existingWaterBody) {
      throw new Error('水体编号已存在');
    }
  }

  await WaterBody.update(data, { where: { waterBodyId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_water_body',
    'water_body',
    `更新水体: ${existing.waterBodyName}`,
    { waterBodyId, ...data }
  );

  const updated = await WaterBody.findByPk(waterBodyId);
  return updated ? updated.toJSON() : null;
};

export const deleteWaterBody = async (
  waterBodyId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const existing = await WaterBody.findByPk(waterBodyId);
  if (!existing) {
    return false;
  }

  const outletCount = await SewageOutlet.count({ where: { waterBodyId } });
  if (outletCount > 0) {
    throw new Error('该水体下存在排污口，无法删除');
  }

  const projectCount = await GovernanceProject.count({ where: { waterBodyId } });
  if (projectCount > 0) {
    throw new Error('该水体下存在治理项目，无法删除');
  }

  await WaterBody.destroy({ where: { waterBodyId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_water_body',
    'water_body',
    `删除水体: ${existing.waterBodyName}`,
    { waterBodyId, waterBodyCode: existing.waterBodyCode }
  );

  return true;
};

export const updateWaterBodyStatus = async (
  waterBodyId: number,
  newStatus: WaterBodyStatus,
  currentUser: IUserAttributes
): Promise<IWaterBodyAttributes | null> => {
  const existing = await WaterBody.findByPk(waterBodyId);
  if (!existing) {
    return null;
  }

  const validTransitions: Record<WaterBodyStatus, WaterBodyStatus[]> = {
    [WaterBodyStatus.UNDER_GOVERNANCE]: [WaterBodyStatus.COMPLETED, WaterBodyStatus.REBOUND],
    [WaterBodyStatus.COMPLETED]: [WaterBodyStatus.REBOUND, WaterBodyStatus.CLOSED],
    [WaterBodyStatus.REBOUND]: [WaterBodyStatus.COMPLETED, WaterBodyStatus.UNDER_GOVERNANCE],
    [WaterBodyStatus.CLOSED]: [WaterBodyStatus.REBOUND],
  };

  const currentStatus = existing.currentStatus as WaterBodyStatus;
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error(`无法从状态${currentStatus}转换到${newStatus}`);
  }

  const updateData: Partial<IWaterBodyAttributes> = { currentStatus: newStatus };
  if (newStatus === WaterBodyStatus.COMPLETED) {
    updateData.actualCompletionDate = new Date();
  }

  await WaterBody.update(updateData, { where: { waterBodyId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_water_body_status',
    'water_body',
    `更新水体状态: ${existing.waterBodyName} - ${newStatus}`,
    { waterBodyId, oldStatus: currentStatus, newStatus }
  );

  const updated = await WaterBody.findByPk(waterBodyId);
  return updated ? updated.toJSON() : null;
};

export const updateGovernanceStage = async (
  waterBodyId: number,
  newStage: GovernanceStage,
  currentUser: IUserAttributes
): Promise<IWaterBodyAttributes | null> => {
  const existing = await WaterBody.findByPk(waterBodyId);
  if (!existing) {
    return null;
  }

  await WaterBody.update({ governanceStage: newStage }, { where: { waterBodyId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_governance_stage',
    'water_body',
    `更新治理阶段: ${existing.waterBodyName} - ${newStage}`,
    { waterBodyId, oldStage: existing.governanceStage, newStage }
  );

  const updated = await WaterBody.findByPk(waterBodyId);
  return updated ? updated.toJSON() : null;
};

export const toggleWaterBodyStatus = async (
  waterBodyId: number,
  isActive: boolean,
  currentUser: IUserAttributes
): Promise<IWaterBodyAttributes | null> => {
  const existing = await WaterBody.findByPk(waterBodyId);
  if (!existing) {
    return null;
  }

  await WaterBody.update({ isActive }, { where: { waterBodyId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    isActive ? 'enable_water_body' : 'disable_water_body',
    'water_body',
    `${isActive ? '启用' : '禁用'}水体: ${existing.waterBodyName}`,
    { waterBodyId, isActive }
  );

  const updated = await WaterBody.findByPk(waterBodyId);
  return updated ? updated.toJSON() : null;
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
  getWaterBodyList,
  getWaterBodyById,
  createWaterBody,
  updateWaterBody,
  deleteWaterBody,
  updateWaterBodyStatus,
  updateGovernanceStage,
  toggleWaterBodyStatus,
};
