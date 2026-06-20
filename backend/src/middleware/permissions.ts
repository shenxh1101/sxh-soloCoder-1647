import { Request, Response, NextFunction } from 'express';
import { UserLevel, UserRole } from '../models/enums';
import { Region } from '../models/Region';
import { DataScope } from '../types/express';
import { Op } from 'sequelize';

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        code: 401,
        message: '未登录',
        timestamp: Date.now()
      });
      return;
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        code: 403,
        message: '权限不足，需要角色：' + roles.join(', '),
        timestamp: Date.now()
      });
      return;
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        code: 401,
        message: '未登录',
        timestamp: Date.now()
      });
      return;
    }

    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    const permissions = req.user.permissions as Record<string, boolean> | undefined;
    if (!permissions || !permissions[permission]) {
      res.status(403).json({
        code: 403,
        message: '权限不足，需要权限：' + permission,
        timestamp: Date.now()
      });
      return;
    }

    next();
  };
};

export const requireLevel = (minLevel: UserLevel) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        code: 401,
        message: '未登录',
        timestamp: Date.now()
      });
      return;
    }

    if (req.user.userLevel > minLevel) {
      res.status(403).json({
        code: 403,
        message: '权限不足，需要至少 ' + getLevelName(minLevel) + ' 级别',
        timestamp: Date.now()
      });
      return;
    }

    next();
  };
};

export const getDataScope = async (userId: number, userLevel: UserLevel, regionId: number): Promise<DataScope> => {
  const regionIds: number[] = [];

  switch (userLevel) {
    case UserLevel.NATIONAL:
      const allRegions = await Region.findAll({
        attributes: ['regionId'],
        where: { isActive: true }
      });
      regionIds.push(...allRegions.map(r => r.regionId));
      break;

    case UserLevel.PROVINCIAL:
      const provincialRegion = await Region.findByPk(regionId);
      if (provincialRegion) {
        regionIds.push(regionId);
        const childRegions = await Region.findAll({
          attributes: ['regionId'],
          where: {
            parentId: regionId,
            isActive: true
          }
        });
        regionIds.push(...childRegions.map(r => r.regionId));
      }
      break;

    case UserLevel.MUNICIPAL:
      regionIds.push(regionId);
      break;
  }

  return {
    regionIds,
    userLevel
  };
};

export const dataScopeFilter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      code: 401,
      message: '未登录',
      timestamp: Date.now()
    });
    return;
  }

  try {
    const dataScope = await getDataScope(
      req.user.userId,
      req.user.userLevel,
      req.user.regionId
    );

    req.query = {
      ...req.query,
      regionIds: dataScope.regionIds.join(',')
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const checkDataAccess = async (
  req: Request,
  targetRegionId: number
): Promise<boolean> => {
  if (!req.user) {
    return false;
  }

  if (req.user.userLevel === UserLevel.NATIONAL) {
    return true;
  }

  if (req.user.userLevel === UserLevel.PROVINCIAL) {
    if (req.user.regionId === targetRegionId) {
      return true;
    }

    const childRegion = await Region.findOne({
      where: {
        regionId: targetRegionId,
        parentId: req.user.regionId,
        isActive: true
      }
    });

    return !!childRegion;
  }

  if (req.user.userLevel === UserLevel.MUNICIPAL) {
    return req.user.regionId === targetRegionId;
  }

  return false;
};

export const dataAccessMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const targetRegionId = Number(req.params.regionId || req.body.regionId || req.query.regionId);

  if (isNaN(targetRegionId)) {
    next();
    return;
  }

  checkDataAccess(req, targetRegionId).then(hasAccess => {
    if (!hasAccess) {
      res.status(403).json({
        code: 403,
        message: '无权访问该区域的数据',
        timestamp: Date.now()
      });
      return;
    }
    next();
  }).catch(next);
};

function getLevelName(level: UserLevel): string {
  const names: Record<UserLevel, string> = {
    [UserLevel.NATIONAL]: '国家级',
    [UserLevel.PROVINCIAL]: '省级',
    [UserLevel.MUNICIPAL]: '市级'
  };
  return names[level] || '未知';
}

export const buildRegionWhereClause = (
  dataScope: DataScope,
  regionField: string = 'regionId'
): Record<string, any> => {
  if (dataScope.regionIds.length === 0) {
    return { [regionField]: null };
  }

  return {
    [regionField]: {
      [Op.in]: dataScope.regionIds
    }
  };
};
