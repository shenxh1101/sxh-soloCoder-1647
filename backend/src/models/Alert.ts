import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { AlertType, AlertLevel, SourceType, AlertStatus, PushStatus } from './enums';

export interface IAlertAttributes {
  alertId: number;
  alertCode: string;
  alertType: AlertType;
  alertLevel: AlertLevel;
  sourceType: SourceType;
  sourceId: number;
  sourceCode?: string;
  sourceName?: string;
  regionId?: number;
  triggerCondition?: string;
  triggerValue?: number;
  thresholdValue?: number;
  alertContent: string;
  alertTime?: Date;
  alertStatus?: AlertStatus;
  pushTargets?: object;
  pushStatus?: PushStatus;
  pushTime?: Date;
  handlerUnit?: string;
  handlerPerson?: string;
  handleDeadline?: Date;
  handleMeasure?: string;
  handleResult?: string;
  handleTime?: Date;
  handleFiles?: object;
  isApprovalNeeded?: boolean;
  relatedApprovalId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAlertCreationAttributes extends Omit<IAlertAttributes, 'alertId' | 'createdAt' | 'updatedAt'> {}

export class Alert extends Model<IAlertAttributes, IAlertCreationAttributes> implements IAlertAttributes {
  public alertId!: number;
  public alertCode!: string;
  public alertType!: AlertType;
  public alertLevel!: AlertLevel;
  public sourceType!: SourceType;
  public sourceId!: number;
  public sourceCode?: string;
  public sourceName?: string;
  public regionId?: number;
  public triggerCondition?: string;
  public triggerValue?: number;
  public thresholdValue?: number;
  public alertContent!: string;
  public alertTime?: Date;
  public alertStatus?: AlertStatus;
  public pushTargets?: object;
  public pushStatus?: PushStatus;
  public pushTime?: Date;
  public handlerUnit?: string;
  public handlerPerson?: string;
  public handleDeadline?: Date;
  public handleMeasure?: string;
  public handleResult?: string;
  public handleTime?: Date;
  public handleFiles?: object;
  public isApprovalNeeded?: boolean;
  public relatedApprovalId?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Alert.init(
  {
    alertId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'alert_id',
    },
    alertCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'alert_code',
    },
    alertType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'alert_type',
    },
    alertLevel: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'alert_level',
    },
    sourceType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'source_type',
    },
    sourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'source_id',
    },
    sourceCode: {
      type: DataTypes.STRING(50),
      field: 'source_code',
    },
    sourceName: {
      type: DataTypes.STRING(200),
      field: 'source_name',
    },
    regionId: {
      type: DataTypes.INTEGER,
      field: 'region_id',
      references: {
        model: 'regions',
        key: 'region_id',
      },
    },
    triggerCondition: {
      type: DataTypes.TEXT,
      field: 'trigger_condition',
    },
    triggerValue: {
      type: DataTypes.DECIMAL(15, 4),
      field: 'trigger_value',
    },
    thresholdValue: {
      type: DataTypes.DECIMAL(15, 4),
      field: 'threshold_value',
    },
    alertContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'alert_content',
    },
    alertTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'alert_time',
    },
    alertStatus: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: AlertStatus.PENDING,
      field: 'alert_status',
    },
    pushTargets: {
      type: DataTypes.JSONB,
      field: 'push_targets',
    },
    pushStatus: {
      type: DataTypes.SMALLINT,
      defaultValue: PushStatus.NOT_PUSHED,
      field: 'push_status',
    },
    pushTime: {
      type: DataTypes.DATE,
      field: 'push_time',
    },
    handlerUnit: {
      type: DataTypes.STRING(200),
      field: 'handler_unit',
    },
    handlerPerson: {
      type: DataTypes.STRING(50),
      field: 'handler_person',
    },
    handleDeadline: {
      type: DataTypes.DATE,
      field: 'handle_deadline',
    },
    handleMeasure: {
      type: DataTypes.TEXT,
      field: 'handle_measure',
    },
    handleResult: {
      type: DataTypes.TEXT,
      field: 'handle_result',
    },
    handleTime: {
      type: DataTypes.DATE,
      field: 'handle_time',
    },
    handleFiles: {
      type: DataTypes.JSONB,
      field: 'handle_files',
    },
    isApprovalNeeded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_approval_needed',
    },
    relatedApprovalId: {
      type: DataTypes.INTEGER,
      field: 'related_approval_id',
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
    tableName: 'alerts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_alert_type',
        fields: ['alert_type'],
      },
      {
        name: 'idx_alert_level',
        fields: ['alert_level'],
      },
      {
        name: 'idx_alert_status',
        fields: ['alert_status'],
      },
      {
        name: 'idx_alert_time',
        fields: ['alert_time'],
      },
      {
        name: 'idx_region_id',
        fields: ['region_id'],
      },
      {
        name: 'idx_source',
        fields: ['source_type', 'source_id'],
      },
    ],
  }
);

export default Alert;
