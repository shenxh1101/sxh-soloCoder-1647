import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import {
  getConfigList,
  getConfigById,
  getConfigValue,
  getAllConfigs,
  createConfig,
  updateConfig,
  updateConfigByKey,
  deleteConfig,
  batchUpdateConfigs,
  clearConfigCache,
  initDefaultConfigs,
  IConfigQuery,
  IConfigUpdateRequest,
} from '../services/systemConfig.service';
import { getFullUserById } from '../services/auth.service';
import { success, error, paginate } from '../utils/response';
import { ConfigType } from '../models/enums';
import { jobScheduler } from '../jobs';

const router = Router();

const createConfigSchema = Joi.object({
  configKey: Joi.string().required().min(1).max(100),
  configValue: Joi.string().allow(''),
  configType: Joi.string().valid(
    ConfigType.STRING,
    ConfigType.NUMBER,
    ConfigType.BOOLEAN,
    ConfigType.JSON
  ).default(ConfigType.STRING),
  description: Joi.string().max(500),
  isEditable: Joi.boolean().default(true),
});

const updateConfigSchema = Joi.object({
  configValue: Joi.string().required(),
  description: Joi.string().max(500),
});

const batchUpdateSchema = Joi.object({
  configs: Joi.array().items(
    Joi.object({
      configKey: Joi.string().required(),
      configValue: Joi.string().required(),
    })
  ).required().min(1),
});

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const query: IConfigQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      configType: req.query.configType as ConfigType,
      configKey: req.query.configKey as string,
      isEditable: req.query.isEditable !== undefined ? req.query.isEditable === 'true' : undefined,
    };

    const { rows, count } = await getConfigList(query);

    paginate(res, rows, query.page!, query.pageSize!, count, '获取配置列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取配置列表失败';
    error(res, message, 500);
  }
});

router.get('/all', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const configs = await getAllConfigs();

    success(res, configs, '获取所有配置成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取所有配置失败';
    error(res, message, 500);
  }
});

router.get('/value/:key', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const configKey = req.params.key;
    const defaultValue = req.query.default as string;

    const value = await getConfigValue(configKey, defaultValue);

    success(res, { configKey, value }, '获取配置值成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取配置值失败';
    error(res, message, 500);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const configId = parseInt(req.params.id);
    if (isNaN(configId)) {
      error(res, '无效的配置ID', 400);
      return;
    }

    const config = await getConfigById(configId);
    if (!config) {
      error(res, '配置不存在', 404);
      return;
    }

    success(res, config, '获取配置详情成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取配置详情失败';
    error(res, message, 500);
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const { error: validationError } = createConfigSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const config = await createConfig(req.body, currentUser);

    success(res, config, '创建配置成功', 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建配置失败';
    error(res, message, 400);
  }
});

router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const configId = parseInt(req.params.id);
    if (isNaN(configId)) {
      error(res, '无效的配置ID', 400);
      return;
    }

    const { error: validationError } = updateConfigSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    const request: IConfigUpdateRequest = {
      configId,
      ...req.body,
    };

    const config = await updateConfig(request, currentUser);
    if (!config) {
      error(res, '配置不存在', 404);
      return;
    }

    success(res, config, '更新配置成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新配置失败';
    error(res, message, 400);
  }
});

router.put('/key/:key', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const configKey = req.params.key;
    const configValue = req.body.configValue;

    if (configValue === undefined) {
      error(res, '配置值不能为空', 400);
      return;
    }

    const config = await updateConfigByKey(configKey, String(configValue), currentUser);
    if (!config) {
      error(res, '配置不存在', 404);
      return;
    }

    success(res, config, '更新配置成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新配置失败';
    error(res, message, 400);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const configId = parseInt(req.params.id);
    if (isNaN(configId)) {
      error(res, '无效的配置ID', 400);
      return;
    }

    const result = await deleteConfig(configId);
    if (!result) {
      error(res, '配置不存在', 404);
      return;
    }

    success(res, null, '删除配置成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除配置失败';
    error(res, message, 400);
  }
});

router.post('/batch-update', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const currentUser = await getFullUserById(req.user.userId);
    if (!currentUser) {
      error(res, '用户不存在', 404);
      return;
    }

    const { error: validationError } = batchUpdateSchema.validate(req.body);
    if (validationError) {
      error(res, validationError.details[0].message, 400);
      return;
    }

    await batchUpdateConfigs(req.body.configs, currentUser);

    success(res, null, '批量更新配置成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '批量更新配置失败';
    error(res, message, 400);
  }
});

router.post('/init-defaults', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    await initDefaultConfigs();

    success(res, null, '初始化默认配置成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '初始化默认配置失败';
    error(res, message, 500);
  }
});

router.post('/clear-cache', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const configKey = req.body.configKey as string | undefined;

    await clearConfigCache(configKey);

    success(res, null, '清除配置缓存成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '清除配置缓存失败';
    error(res, message, 500);
  }
});

router.get('/jobs', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const jobs = jobScheduler.getJobList();

    success(res, jobs, '获取定时任务列表成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取定时任务列表失败';
    error(res, message, 500);
  }
});

router.post('/jobs/:name/start', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const jobName = req.params.name;

    const successFlag = jobScheduler.startJob(jobName);
    if (!successFlag) {
      error(res, '定时任务不存在', 404);
      return;
    }

    success(res, null, '启动定时任务成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '启动定时任务失败';
    error(res, message, 500);
  }
});

router.post('/jobs/:name/stop', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const jobName = req.params.name;

    const successFlag = jobScheduler.stopJob(jobName);
    if (!successFlag) {
      error(res, '定时任务不存在', 404);
      return;
    }

    success(res, null, '停止定时任务成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '停止定时任务失败';
    error(res, message, 500);
  }
});

router.post('/jobs/:name/run', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      error(res, '用户未认证', 401);
      return;
    }

    const jobName = req.params.name;

    const successFlag = await jobScheduler.runJobManually(jobName);
    if (!successFlag) {
      error(res, '定时任务不存在或不支持手动执行', 404);
      return;
    }

    success(res, null, '手动执行定时任务成功');
  } catch (err) {
    const message = err instanceof Error ? err.message : '手动执行定时任务失败';
    error(res, message, 500);
  }
});

export default router;
