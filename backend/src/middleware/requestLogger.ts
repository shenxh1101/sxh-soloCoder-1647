import { Request, Response, NextFunction } from 'express';
import { OperationLog } from '../models/OperationLog';

const EXCLUDE_LOG_PATHS = [
  '/health',
  '/favicon.ico',
  '/static',
  '/uploads'
];

const EXCLUDE_LOG_METHODS: string[] = [
  'OPTIONS',
  'HEAD'
];

const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'secret', 'creditCard', 'cvv'];

export const requestLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (shouldSkipLogging(req)) {
    next();
    return;
  }

  req.startTime = Date.now();

  try {
    const operationType = getOperationType(req);
    const moduleName = getModuleName(req);

    const log = await OperationLog.create({
      userId: req.user?.userId,
      username: req.user?.username,
      operationType,
      moduleName,
      operationContent: `${req.method} ${req.originalUrl}`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestParams: filterSensitiveData({
        query: req.query,
        body: req.body,
        params: req.params
      }),
      executionTime: 0,
      isSuccess: true
    });

    req.operationLogId = log.logId;

    const originalSend = res.send;
    const originalJson = res.json;

    let responseBody: any = null;

    res.json = function(body: any): Response {
      responseBody = body;
      return originalJson.call(this, body);
    };

    res.send = function(body: any): Response {
      if (typeof body === 'string') {
        try {
          responseBody = JSON.parse(body);
        } catch {
          responseBody = { content: body.substring(0, 500) };
        }
      } else {
        responseBody = body;
      }
      return originalSend.call(this, body);
    };

    res.on('finish', async () => {
      try {
        const executionTime = Date.now() - (req.startTime || 0);
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

        await OperationLog.update(
          {
            responseResult: filterSensitiveData(responseBody),
            executionTime,
            isSuccess
          },
          {
            where: { logId: req.operationLogId }
          }
        );
      } catch (err) {
        console.error('Failed to update operation log:', err);
      }
    });

    next();
  } catch (err) {
    console.error('Failed to create operation log:', err);
    next();
  }
};

export const createOperationLog = async (
  req: Request,
  operationType: string,
  operationContent: string,
  moduleName?: string,
  isSuccess: boolean = true
): Promise<void> => {
  try {
    await OperationLog.create({
      userId: req.user?.userId,
      username: req.user?.username,
      operationType,
      moduleName: moduleName || getModuleName(req),
      operationContent,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestParams: filterSensitiveData({
        query: req.query,
        body: req.body,
        params: req.params
      }),
      executionTime: req.startTime ? Date.now() - req.startTime : undefined,
      isSuccess
    });
  } catch (err) {
    console.error('Failed to create custom operation log:', err);
  }
};

function shouldSkipLogging(req: Request): boolean {
  if (EXCLUDE_LOG_METHODS.includes(req.method)) {
    return true;
  }

  for (const path of EXCLUDE_LOG_PATHS) {
    if (req.path.startsWith(path)) {
      return true;
    }
  }

  return false;
}

function getOperationType(req: Request): string {
  const method = req.method.toUpperCase();
  const path = req.path;

  if (method === 'POST' && path.includes('/login')) return 'LOGIN';
  if (method === 'POST' && path.includes('/logout')) return 'LOGOUT';
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  if (method === 'GET') return 'QUERY';

  return method;
}

function getModuleName(req: Request): string {
  const path = req.path;
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 0) return 'root';

  const moduleMap: Record<string, string> = {
    'api': parts[1] || 'api',
    'auth': '认证',
    'users': '用户管理',
    'roles': '角色管理',
    'permissions': '权限管理',
    'regions': '区域管理',
    'water-bodies': '水体管理',
    'sewage-outlets': '排污口管理',
    'projects': '项目管理',
    'water-quality': '水质数据',
    'alerts': '预警管理',
    'complaints': '投诉工单',
    'approvals': '审批管理',
    'reports': '报表管理',
    'statistics': '统计分析',
    'config': '系统配置',
    'logs': '日志管理',
    'uploads': '文件上传'
  };

  for (const part of parts) {
    if (moduleMap[part]) {
      return moduleMap[part];
    }
  }

  return parts[0] || 'unknown';
}

function getClientIp(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (Array.isArray(xForwardedFor)) {
      return xForwardedFor[0];
    }
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
  }

  return req.ip || req.connection.remoteAddress || 'unknown';
}

function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveData(item));
  }

  const filtered: Record<string, any> = {};

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        filtered[key] = '***';
      } else {
        filtered[key] = filterSensitiveData(data[key]);
      }
    }
  }

  return filtered;
}
