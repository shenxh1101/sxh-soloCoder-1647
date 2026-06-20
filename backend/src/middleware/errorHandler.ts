import { Request, Response, NextFunction } from 'express';
import { OperationLog } from '../models/OperationLog';
import { config } from '../config';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly data?: any;

  constructor(message: string, statusCode: number = 500, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: any) {
    super(message, 400, errors);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权访问') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export const errorHandler = async (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let statusCode = 500;
  let message = '服务器内部错误';
  let errors: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.data;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '参数验证失败';
    errors = (err as any).errors;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的令牌';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '令牌已过期';
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = '数据验证失败';
    errors = (err as any).errors?.map((e: any) => ({
      field: e.path,
      message: e.message
    }));
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = '数据已存在';
    errors = (err as any).errors?.map((e: any) => ({
      field: e.path,
      message: e.message
    }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = '关联数据不存在或无效';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = '文件上传错误：' + (err as any).message;
  }

  const logError = {
    timestamp: new Date().toISOString(),
    statusCode,
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
      body: filterSensitiveData(req.body),
      query: req.query,
      params: req.params
    },
    user: req.user ? {
      userId: req.user.userId,
      username: req.user.username
    } : undefined
  };

  console.error('[ERROR]', JSON.stringify(logError, null, 2));

  if (req.operationLogId) {
    try {
      const executionTime = req.startTime ? Date.now() - req.startTime : undefined;
      await OperationLog.update(
        {
          isSuccess: false,
          responseResult: {
            code: statusCode,
            message,
            errors
          },
          executionTime
        },
        {
          where: { logId: req.operationLogId }
        }
      );
    } catch (updateErr) {
      console.error('Failed to update operation log:', updateErr);
    }
  }

  const response: any = {
    code: statusCode,
    message,
    timestamp: Date.now()
  };

  if (errors) {
    response.errors = errors;
  }

  if (config.nodeEnv === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  next(new NotFoundError(`接口不存在: ${req.method} ${req.originalUrl}`));
};

export const asyncHandler = <T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

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

function filterSensitiveData(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'creditCard', 'cvv'];
  const filtered: any = Array.isArray(body) ? [] : {};

  for (const key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        filtered[key] = '***';
      } else if (typeof body[key] === 'object' && body[key] !== null) {
        filtered[key] = filterSensitiveData(body[key]);
      } else {
        filtered[key] = body[key];
      }
    }
  }

  return filtered;
}
