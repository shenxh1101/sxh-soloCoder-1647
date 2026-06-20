import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';

export interface IOperationLogAttributes {
  logId: number;
  userId?: number;
  username?: string;
  operationType: string;
  moduleName?: string;
  operationContent?: string;
  ipAddress?: string;
  userAgent?: string;
  requestParams?: object;
  responseResult?: object;
  operationTime?: Date;
  executionTime?: number;
  isSuccess?: boolean;
}

export interface IOperationLogCreationAttributes extends Omit<IOperationLogAttributes, 'logId' | 'operationTime'> {}

export class OperationLog extends Model<IOperationLogAttributes, IOperationLogCreationAttributes> implements IOperationLogAttributes {
  public logId!: number;
  public userId?: number;
  public username?: string;
  public operationType!: string;
  public moduleName?: string;
  public operationContent?: string;
  public ipAddress?: string;
  public userAgent?: string;
  public requestParams?: object;
  public responseResult?: object;
  public readonly operationTime!: Date;
  public executionTime?: number;
  public isSuccess?: boolean;
}

OperationLog.init(
  {
    logId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'log_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    username: {
      type: DataTypes.STRING(50),
      field: 'username',
    },
    operationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'operation_type',
    },
    moduleName: {
      type: DataTypes.STRING(50),
      field: 'module_name',
    },
    operationContent: {
      type: DataTypes.TEXT,
      field: 'operation_content',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.STRING(500),
      field: 'user_agent',
    },
    requestParams: {
      type: DataTypes.JSONB,
      field: 'request_params',
    },
    responseResult: {
      type: DataTypes.JSONB,
      field: 'response_result',
    },
    operationTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'operation_time',
    },
    executionTime: {
      type: DataTypes.INTEGER,
      field: 'execution_time',
    },
    isSuccess: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_success',
    },
  },
  {
    sequelize,
    tableName: 'operation_logs',
    timestamps: false,
    indexes: [
      {
        name: 'idx_user_id',
        fields: ['user_id'],
      },
      {
        name: 'idx_operation_time',
        fields: ['operation_time'],
      },
      {
        name: 'idx_operation_type',
        fields: ['operation_type'],
      },
      {
        name: 'idx_module_name',
        fields: ['module_name'],
      },
    ],
  }
);

export default OperationLog;
