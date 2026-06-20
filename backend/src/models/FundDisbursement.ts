import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { FundType, PaymentStatus } from './enums';

export interface IFundDisbursementAttributes {
  disbursementId: number;
  taskId?: number;
  projectId?: number;
  disbursementDate: Date;
  amount: number;
  fundType: FundType;
  purpose?: string;
  recipientUnit?: string;
  paymentStatus?: PaymentStatus;
  paymentVoucher?: string;
  operatorId?: number;
  createdAt?: Date;
}

export interface IFundDisbursementCreationAttributes extends Omit<IFundDisbursementAttributes, 'disbursementId' | 'createdAt'> {}

export class FundDisbursement extends Model<IFundDisbursementAttributes, IFundDisbursementCreationAttributes> implements IFundDisbursementAttributes {
  public disbursementId!: number;
  public taskId?: number;
  public projectId?: number;
  public disbursementDate!: Date;
  public amount!: number;
  public fundType!: FundType;
  public purpose?: string;
  public recipientUnit?: string;
  public paymentStatus?: PaymentStatus;
  public paymentVoucher?: string;
  public operatorId?: number;
  public readonly createdAt!: Date;
}

FundDisbursement.init(
  {
    disbursementId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'disbursement_id',
    },
    taskId: {
      type: DataTypes.INTEGER,
      field: 'task_id',
      references: {
        model: 'annual_tasks',
        key: 'task_id',
      },
    },
    projectId: {
      type: DataTypes.INTEGER,
      field: 'project_id',
      references: {
        model: 'governance_projects',
        key: 'project_id',
      },
    },
    disbursementDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'disbursement_date',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'amount',
    },
    fundType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'fund_type',
    },
    purpose: {
      type: DataTypes.TEXT,
      field: 'purpose',
    },
    recipientUnit: {
      type: DataTypes.STRING(200),
      field: 'recipient_unit',
    },
    paymentStatus: {
      type: DataTypes.SMALLINT,
      defaultValue: PaymentStatus.PENDING,
      field: 'payment_status',
    },
    paymentVoucher: {
      type: DataTypes.STRING(200),
      field: 'payment_voucher',
    },
    operatorId: {
      type: DataTypes.INTEGER,
      field: 'operator_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'fund_disbursements',
    timestamps: false,
    createdAt: 'created_at',
    indexes: [
      {
        name: 'idx_task_id',
        fields: ['task_id'],
      },
      {
        name: 'idx_project_id',
        fields: ['project_id'],
      },
      {
        name: 'idx_disbursement_date',
        fields: ['disbursement_date'],
      },
    ],
  }
);

export default FundDisbursement;
