import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { TaskType, TaskStatus, FundMatchStatus } from './enums';
import { Region } from './Region';

export interface IAnnualTaskAttributes {
  taskId: number;
  taskCode: string;
  year: number;
  regionId: number;
  waterBodyId?: number;
  taskType: TaskType;
  taskContent: string;
  targetIndicator?: object;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  plannedBudget?: number;
  allocatedFunds?: number;
  actualExpenditure?: number;
  budgetDeviation?: number;
  taskStatus?: TaskStatus;
  completionRate?: number;
  fundMatchStatus?: FundMatchStatus;
  isBudgetAbnormal?: boolean;
  abnormalReminder?: string;
  uploadUserId?: number;
  uploadTime?: Date;
  excelFileUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnnualTaskCreationAttributes extends Omit<IAnnualTaskAttributes, 'taskId' | 'createdAt' | 'updatedAt'> {}

export class AnnualTask extends Model<IAnnualTaskAttributes, IAnnualTaskCreationAttributes> implements IAnnualTaskAttributes {
  public taskId!: number;
  public taskCode!: string;
  public year!: number;
  public regionId!: number;
  public waterBodyId?: number;
  public taskType!: TaskType;
  public taskContent!: string;
  public targetIndicator?: object;
  public plannedStartDate?: Date;
  public plannedEndDate?: Date;
  public plannedBudget?: number;
  public allocatedFunds?: number;
  public actualExpenditure?: number;
  public budgetDeviation?: number;
  public taskStatus?: TaskStatus;
  public completionRate?: number;
  public fundMatchStatus?: FundMatchStatus;
  public isBudgetAbnormal?: boolean;
  public abnormalReminder?: string;
  public uploadUserId?: number;
  public uploadTime?: Date;
  public excelFileUrl?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public region?: Region;
}

AnnualTask.init(
  {
    taskId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'task_id',
    },
    taskCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'task_code',
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'year',
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'region_id',
      references: {
        model: 'regions',
        key: 'region_id',
      },
    },
    waterBodyId: {
      type: DataTypes.INTEGER,
      field: 'water_body_id',
      references: {
        model: 'water_bodies',
        key: 'water_body_id',
      },
    },
    taskType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'task_type',
    },
    taskContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'task_content',
    },
    targetIndicator: {
      type: DataTypes.JSONB,
      field: 'target_indicator',
    },
    plannedStartDate: {
      type: DataTypes.DATEONLY,
      field: 'planned_start_date',
    },
    plannedEndDate: {
      type: DataTypes.DATEONLY,
      field: 'planned_end_date',
    },
    plannedBudget: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'planned_budget',
    },
    allocatedFunds: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'allocated_funds',
    },
    actualExpenditure: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'actual_expenditure',
    },
    budgetDeviation: {
      type: DataTypes.DECIMAL(6, 2),
      defaultValue: 0,
      field: 'budget_deviation',
    },
    taskStatus: {
      type: DataTypes.SMALLINT,
      defaultValue: TaskStatus.NOT_STARTED,
      field: 'task_status',
    },
    completionRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'completion_rate',
    },
    fundMatchStatus: {
      type: DataTypes.SMALLINT,
      field: 'fund_match_status',
    },
    isBudgetAbnormal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_budget_abnormal',
    },
    abnormalReminder: {
      type: DataTypes.TEXT,
      field: 'abnormal_reminder',
    },
    uploadUserId: {
      type: DataTypes.INTEGER,
      field: 'upload_user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    uploadTime: {
      type: DataTypes.DATE,
      field: 'upload_time',
    },
    excelFileUrl: {
      type: DataTypes.STRING(500),
      field: 'excel_file_url',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'annual_tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'annual_tasks_year_region_id_water_body_id_task_type_key',
        fields: ['year', 'region_id', 'water_body_id', 'task_type'],
        unique: true,
      },
      {
        name: 'idx_year_region',
        fields: ['year', 'region_id'],
      },
      {
        name: 'idx_task_status',
        fields: ['task_status'],
      },
      {
        name: 'idx_is_budget_abnormal',
        fields: ['is_budget_abnormal'],
      },
    ],
  }
);

export default AnnualTask;
