import { IUserAttributes } from '../models/User';
import { UserLevel, UserRole } from '../models/enums';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        realName: string;
        userLevel: UserLevel;
        regionId: number;
        role?: UserRole;
        permissions?: object;
      };
      startTime?: number;
      operationLogId?: number;
    }

    interface Response {
      sendSuccess: (data?: any, message?: string) => Response;
      sendError: (message: string, code?: number) => Response;
    }
  }
}

export interface JwtPayload {
  userId: number;
  username: string;
  realName: string;
  userLevel: UserLevel;
  regionId: number;
  role?: UserRole;
  permissions?: object;
  iat?: number;
  exp?: number;
}

export interface DataScope {
  regionIds: number[];
  userLevel: UserLevel;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}
