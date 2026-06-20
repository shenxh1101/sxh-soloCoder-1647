import { Response } from 'express';

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const success = <T = any>(res: Response, data?: T, message: string = 'success', code: number = 200): Response => {
  return res.status(code).json({
    code,
    message,
    data,
    timestamp: Date.now(),
  });
};

export const error = (res: Response, message: string = 'error', code: number = 500, data?: any): Response => {
  return res.status(code).json({
    code,
    message,
    data,
    timestamp: Date.now(),
  });
};

export const paginate = <T = any>(
  res: Response,
  data: T[],
  page: number,
  pageSize: number,
  total: number,
  message: string = 'success',
  code: number = 200
): Response => {
  const totalPages = Math.ceil(total / pageSize);
  return res.status(code).json({
    code,
    message,
    data: {
      list: data,
      total,
      pageNum: page,
      pageSize,
      totalPages,
    },
    timestamp: Date.now(),
  });
};

export default {
  success,
  error,
  paginate,
};
