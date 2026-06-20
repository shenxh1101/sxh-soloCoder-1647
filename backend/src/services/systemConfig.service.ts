import { SystemConfig, ISystemConfigAttributes, ISystemConfigCreationAttributes } from '../models/SystemConfig';
import { ConfigType } from '../models/enums';
import redis from '../config/redis';
import { Op } from 'sequelize';

const CONFIG_CACHE_PREFIX = 'system:config:';
const CONFIG_CACHE_TTL = 3600;

export interface IConfigQuery {
  configType?: ConfigType;
  configKey?: string;
  isEditable?: boolean;
  page?: number;
  pageSize?: number;
}

export interface IConfigUpdateRequest {
  configId: number;
  configValue: string;
  description?: string;
}

export const getConfigValue = async <T = string>(
  configKey: string,
  defaultValue?: T
): Promise<T | undefined> => {
  const cacheKey = `${CONFIG_CACHE_PREFIX}${configKey}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return parseConfigValue(cached) as T;
    }
  } catch (err) {
    console.error(`[systemConfig] Redis get error for ${configKey}:`, err);
  }

  const config = await SystemConfig.findOne({
    where: { configKey },
  });

  if (!config) {
    return defaultValue;
  }

  try {
    await redis.setex(cacheKey, CONFIG_CACHE_TTL, config.configValue || '');
  } catch (err) {
    console.error(`[systemConfig] Redis set error for ${configKey}:`, err);
  }

  return parseConfigValue(config.configValue) as T;
};

export const getConfigThreshold = async (
  configKey: string,
  defaultValue: number
): Promise<number> => {
  const value = await getConfigValue(configKey, String(defaultValue));
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

export const getConfigList = async (
  query: IConfigQuery
): Promise<{ rows: ISystemConfigAttributes[]; count: number }> => {
  const { configType, configKey, isEditable, page = 1, pageSize = 20 } = query;

  const where: any = {};
  if (configType) where.configType = configType;
  if (configKey) where.configKey = { [Op.like]: `%${configKey}%` };
  if (isEditable !== undefined) where.isEditable = isEditable;

  const { rows, count } = await SystemConfig.findAndCountAll({
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['configId', 'ASC']],
  });

  return { rows, count };
};

export const getAllConfigs = async (): Promise<Record<string, string>> => {
  const configs = await SystemConfig.findAll();
  const result: Record<string, string> = {};
  configs.forEach(config => {
    result[config.configKey] = config.configValue || '';
  });
  return result;
};

export const getConfigById = async (
  configId: number
): Promise<ISystemConfigAttributes | null> => {
  return await SystemConfig.findByPk(configId);
};

export const createConfig = async (
  configData: ISystemConfigCreationAttributes,
  currentUser: { userId: number; username: string }
): Promise<ISystemConfigAttributes> => {
  const existing = await SystemConfig.findOne({
    where: { configKey: configData.configKey },
  });

  if (existing) {
    throw new Error(`配置键 ${configData.configKey} 已存在`);
  }

  const config = await SystemConfig.create({
    ...configData,
    updatedBy: currentUser.userId,
  });

  await clearConfigCache(config.configKey);

  return config;
};

export const updateConfig = async (
  request: IConfigUpdateRequest,
  currentUser: { userId: number; username: string }
): Promise<ISystemConfigAttributes | null> => {
  const config = await SystemConfig.findByPk(request.configId);
  if (!config) {
    return null;
  }

  if (!config.isEditable) {
    throw new Error('该配置不允许编辑');
  }

  await config.update({
    configValue: request.configValue,
    description: request.description ?? config.description,
    updatedBy: currentUser.userId,
    updatedAt: new Date(),
  });

  await clearConfigCache(config.configKey);

  return config.reload();
};

export const updateConfigByKey = async (
  configKey: string,
  configValue: string,
  currentUser: { userId: number; username: string }
): Promise<ISystemConfigAttributes | null> => {
  const config = await SystemConfig.findOne({
    where: { configKey },
  });

  if (!config) {
    return null;
  }

  if (!config.isEditable) {
    throw new Error('该配置不允许编辑');
  }

  await config.update({
    configValue,
    updatedBy: currentUser.userId,
    updatedAt: new Date(),
  });

  await clearConfigCache(configKey);

  return config.reload();
};

export const deleteConfig = async (configId: number): Promise<boolean> => {
  const config = await SystemConfig.findByPk(configId);
  if (!config) {
    return false;
  }

  if (!config.isEditable) {
    throw new Error('该配置不允许删除');
  }

  const configKey = config.configKey;
  await config.destroy();
  await clearConfigCache(configKey);

  return true;
};

export const batchUpdateConfigs = async (
  configs: Array<{ configKey: string; configValue: string }>,
  currentUser: { userId: number; username: string }
): Promise<void> => {
  for (const item of configs) {
    await updateConfigByKey(item.configKey, item.configValue, currentUser);
  }
};

export const clearConfigCache = async (configKey?: string): Promise<void> => {
  try {
    if (configKey) {
      await redis.del(`${CONFIG_CACHE_PREFIX}${configKey}`);
    } else {
      const keys = await redis.keys(`${CONFIG_CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (err) {
    console.error('[systemConfig] Redis clear cache error:', err);
  }
};

export const initDefaultConfigs = async (): Promise<void> => {
  const defaultConfigs: Array<ISystemConfigCreationAttributes> = [
    {
      configKey: 'alert:continuous_overproof_days',
      configValue: '3',
      configType: ConfigType.NUMBER,
      description: '连续超标预警天数阈值',
      isEditable: true,
    },
    {
      configKey: 'alert:progress_delay_threshold',
      configValue: '30',
      configType: ConfigType.NUMBER,
      description: '进度滞后预警阈值（百分比）',
      isEditable: true,
    },
    {
      configKey: 'alert:fund_deviation_threshold',
      configValue: '15',
      configType: ConfigType.NUMBER,
      description: '资金异常预警阈值（百分比）',
      isEditable: true,
    },
    {
      configKey: 'alert:complaint_surge_threshold',
      configValue: '50',
      configType: ConfigType.NUMBER,
      description: '投诉突增预警阈值（百分比）',
      isEditable: true,
    },
    {
      configKey: 'approval:stage1_timeout_days',
      configValue: '3',
      configType: ConfigType.NUMBER,
      description: '一级审批超时时限（天）',
      isEditable: true,
    },
    {
      configKey: 'approval:stage2_timeout_days',
      configValue: '5',
      configType: ConfigType.NUMBER,
      description: '二级审批超时时限（天）',
      isEditable: true,
    },
    {
      configKey: 'approval:stage3_timeout_days',
      configValue: '7',
      configType: ConfigType.NUMBER,
      description: '三级审批超时时限（天）',
      isEditable: true,
    },
    {
      configKey: 'stats:water_quality_days',
      configValue: '7',
      configType: ConfigType.NUMBER,
      description: '水质达标率统计天数',
      isEditable: true,
    },
    {
      configKey: 'stats:satisfaction_days',
      configValue: '30',
      configType: ConfigType.NUMBER,
      description: '公众满意度统计天数',
      isEditable: true,
    },
    {
      configKey: 'stats:outlet_abnormal_days',
      configValue: '3',
      configType: ConfigType.NUMBER,
      description: '排污口异常统计天数',
      isEditable: true,
    },
    {
      configKey: 'data:retention_days',
      configValue: '180',
      configType: ConfigType.NUMBER,
      description: '数据保留天数',
      isEditable: true,
    },
    {
      configKey: 'report:auto_generate',
      configValue: 'true',
      configType: ConfigType.BOOLEAN,
      description: '是否自动生成周报',
      isEditable: true,
    },
    {
      configKey: 'push:enable_sms',
      configValue: 'false',
      configType: ConfigType.BOOLEAN,
      description: '是否启用短信推送',
      isEditable: true,
    },
    {
      configKey: 'push:enable_email',
      configValue: 'true',
      configType: ConfigType.BOOLEAN,
      description: '是否启用邮件推送',
      isEditable: true,
    },
    {
      configKey: 'push:enable_wechat',
      configValue: 'false',
      configType: ConfigType.BOOLEAN,
      description: '是否启用微信推送',
      isEditable: true,
    },
  ];

  for (const config of defaultConfigs) {
    try {
      await SystemConfig.findOrCreate({
        where: { configKey: config.configKey },
        defaults: config,
      });
    } catch (err) {
      console.error(`[systemConfig] Init config ${config.configKey} error:`, err);
    }
  }
};

const parseConfigValue = (value: string | null | undefined): any => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (value === 'true') return true;
  if (value === 'false') return false;

  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') {
    return num;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export default {
  getConfigValue,
  getConfigThreshold,
  getConfigList,
  getAllConfigs,
  getConfigById,
  createConfig,
  updateConfig,
  updateConfigByKey,
  deleteConfig,
  batchUpdateConfigs,
  clearConfigCache,
  initDefaultConfigs,
};
