import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { OperationType } from './enums';

export interface IApprovalHistoryAttributes {
  historyId: number;
  workflowId: number;
  stage: number;
  operatorId: number;
  operationType: OperationType;
  opinion?: string;
  operationTime?: Date;
  attachments?: object;
}

export interface IApprovalHistoryCreationAttributes extends Omit<IApprovalHistoryAttributes, 'historyId' | 'operationTime'> {}

export class ApprovalHistory extends Model<IApprovalHistoryAttributes, IApprovalHistoryCreationAttributes> implements IApprovalHistoryAttributes {
  public historyId!: number;
  public workflowId!: number;
  public stage!: number;
  public operatorId!: number;
  public operationType!: OperationType;
  public opinion?: string;
  public readonly operationTime!: Date;
  public attachments?: object;
}

ApprovalHistory.init(
  {
    historyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'history_id',
    },
    workflowId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'workflow_id',
      references: {
        model: 'approval_workflows',
        key: 'workflow_id',
      },
    },
    stage: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'stage',
    },
    operatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'operator_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    operationType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'operation_type',
    },
    opinion: {
      type: DataTypes.TEXT,
      field: 'opinion',
    },
    operationTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'operation_time',
    },
    attachments: {
      type: DataTypes.JSONB,
      field: 'attachments',
    },
  },
  {
    sequelize,
    tableName: 'approval_history',
    timestamps: false,
    indexes: [
      {
        name: 'idx_workflow_id',
        fields: ['workflow_id'],
      },
      {
        name: 'idx_stage',
        fields: ['stage'],
      },
    ],
  }
);

export default ApprovalHistory;
