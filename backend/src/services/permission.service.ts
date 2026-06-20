import { Op, FindOptions } from 'sequelize';
import { Region } from '../models/Region';
import { User, IUserAttributes } from '../models/User';
import { UserLevel, UserRole } from '../models/enums';
import { redis } from '../config';

export interface IPermissionFilter {
  regionIds?: number[];
  userLevel?: UserLevel;
}

const REGION_CACHE_PREFIX = 'permission:region:';
const CACHE_TTL = 3600;

export const getVisibleRegionIds = async (user: IUserAttributes): Promise<number[]> => {
  const cacheKey = `${REGION_CACHE_PREFIX}${user.userId}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('Redis cache miss for region ids:', err);
  }

  let regionIds: number[] = [];

  switch (user.userLevel) {
    case UserLevel.NATIONAL:
      const allRegions = await Region.findAll({
        attributes: ['regionId'],
        where: { isActive: true },
      });
      regionIds = allRegions.map(r => r.regionId);
      break;

    case UserLevel.PROVINCIAL:
      const provinceRegion = await Region.findByPk(user.regionId);
      if (provinceRegion) {
        const childRegions = await Region.findAll({
          attributes: ['regionId'],
          where: {
            parentId: provinceRegion.regionId,
            isActive: true,
          },
        });
        regionIds = [provinceRegion.regionId, ...childRegions.map(r => r.regionId)];
      }
      break;

    case UserLevel.MUNICIPAL:
      regionIds = [user.regionId];
      break;

    default:
      regionIds = [user.regionId];
  }

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(regionIds));
  } catch (err) {
    console.warn('Failed to cache region ids:', err);
  }

  return regionIds;
};

export const applyDataPermissionFilter = async <T>(
  options: FindOptions<T>,
  user: IUserAttributes,
  regionField: string = 'regionId'
): Promise<FindOptions<T>> => {
  const visibleRegionIds = await getVisibleRegionIds(user);
  
  const filteredOptions: FindOptions<T> = { ...options };
  
  if (filteredOptions.where) {
    filteredOptions.where = {
      ...filteredOptions.where,
      [regionField]: { [Op.in]: visibleRegionIds },
    } as any;
  } else {
    filteredOptions.where = {
      [regionField]: { [Op.in]: visibleRegionIds },
    } as any;
  }

  return filteredOptions;
};

export const checkFunctionPermission = (
  user: IUserAttributes,
  permission: string
): boolean => {
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  if (user.permissions && typeof user.permissions === 'object') {
    const perms = user.permissions as Record<string, boolean>;
    return perms[permission] === true;
  }

  return false;
};

export const canManageUser = (
  currentUser: IUserAttributes,
  targetUser: IUserAttributes
): boolean => {
  if (currentUser.role === UserRole.ADMIN) {
    return true;
  }

  if (currentUser.userLevel < targetUser.userLevel) {
    return true;
  }

  if (currentUser.userLevel === targetUser.userLevel && currentUser.role === UserRole.APPROVER) {
    return true;
  }

  return false;
};

export const clearRegionCache = async (userId: number): Promise<void> => {
  const cacheKey = `${REGION_CACHE_PREFIX}${userId}`;
  try {
    await redis.del(cacheKey);
  } catch (err) {
    console.warn('Failed to clear region cache:', err);
  }
};

export const clearAllRegionCache = async (): Promise<void> => {
  try {
    const keys = await redis.keys(`${REGION_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn('Failed to clear all region cache:', err);
  }
};

export default {
  getVisibleRegionIds,
  applyDataPermissionFilter,
  checkFunctionPermission,
  canManageUser,
  clearRegionCache,
  clearAllRegionCache,
};
