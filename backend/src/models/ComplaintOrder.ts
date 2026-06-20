import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { ComplaintSource, ComplaintType, Priority, OrderStatus } from './enums';

export interface IComplaintOrderAttributes {
  complaintId: number;
  complaintCode: string;
  waterBodyId?: number;
  regionId?: number;
  source: ComplaintSource;
  complaintType: ComplaintType;
  complaintContent: string;
  complaintTime: Date;
  complainantName?: string;
  complainantPhone?: string;
  complainantAddress?: string;
  location?: object;
  locationDescription?: string;
  attachments?: object;
  priority?: Priority;
  orderStatus?: OrderStatus;
  satisfactionScore?: number;
  satisfactionFeedback?: string;
  hotKeywords?: string[];
  handlerUnit?: string;
  handlerPerson?: string;
  deadline?: Date;
  acceptTime?: Date;
  processStartTime?: Date;
  processEndTime?: Date;
  processResult?: string;
  reviewTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IComplaintOrderCreationAttributes extends Omit<IComplaintOrderAttributes, 'complaintId' | 'createdAt' | 'updatedAt'> {}

export class ComplaintOrder extends Model<IComplaintOrderAttributes, IComplaintOrderCreationAttributes> implements IComplaintOrderAttributes {
  public complaintId!: number;
  public complaintCode!: string;
  public waterBodyId?: number;
  public regionId?: number;
  public source!: ComplaintSource;
  public complaintType!: ComplaintType;
  public complaintContent!: string;
  public complaintTime!: Date;
  public complainantName?: string;
  public complainantPhone?: string;
  public complainantAddress?: string;
  public location?: object;
  public locationDescription?: string;
  public attachments?: object;
  public priority?: Priority;
  public orderStatus?: OrderStatus;
  public satisfactionScore?: number;
  public satisfactionFeedback?: string;
  public hotKeywords?: string[];
  public handlerUnit?: string;
  public handlerPerson?: string;
  public deadline?: Date;
  public acceptTime?: Date;
  public processStartTime?: Date;
  public processEndTime?: Date;
  public processResult?: string;
  public reviewTime?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ComplaintOrder.init(
  {
    complaintId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'complaint_id',
    },
    complaintCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'complaint_code',
    },
    waterBodyId: {
      type: DataTypes.INTEGER,
      field: 'water_body_id',
      references: {
        model: 'water_bodies',
        key: 'water_body_id',
      },
    },
    regionId: {
      type: DataTypes.INTEGER,
      field: 'region_id',
      references: {
        model: 'regions',
        key: 'region_id',
      },
    },
    source: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'source',
    },
    complaintType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'complaint_type',
    },
    complaintContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'complaint_content',
    },
    complaintTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'complaint_time',
    },
    complainantName: {
      type: DataTypes.STRING(50),
      field: 'complainant_name',
    },
    complainantPhone: {
      type: DataTypes.STRING(20),
      field: 'complainant_phone',
    },
    complainantAddress: {
      type: DataTypes.STRING(200),
      field: 'complainant_address',
    },
    location: {
      type: DataTypes.GEOMETRY('Point', 4326),
      field: 'location',
    },
    locationDescription: {
      type: DataTypes.STRING(200),
      field: 'location_description',
    },
    attachments: {
      type: DataTypes.JSONB,
      field: 'attachments',
    },
    priority: {
      type: DataTypes.SMALLINT,
      defaultValue: Priority.NORMAL,
      field: 'priority',
    },
    orderStatus: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: OrderStatus.PENDING_ACCEPTANCE,
      field: 'order_status',
    },
    satisfactionScore: {
      type: DataTypes.SMALLINT,
      field: 'satisfaction_score',
      validate: {
        min: 1,
        max: 5,
      },
    },
    satisfactionFeedback: {
      type: DataTypes.TEXT,
      field: 'satisfaction_feedback',
    },
    hotKeywords: {
      type: DataTypes.ARRAY(DataTypes.STRING(200)),
      field: 'hot_keywords',
    },
    handlerUnit: {
      type: DataTypes.STRING(200),
      field: 'handler_unit',
    },
    handlerPerson: {
      type: DataTypes.STRING(50),
      field: 'handler_person',
    },
    deadline: {
      type: DataTypes.DATE,
      field: 'deadline',
    },
    acceptTime: {
      type: DataTypes.DATE,
      field: 'accept_time',
    },
    processStartTime: {
      type: DataTypes.DATE,
      field: 'process_start_time',
    },
    processEndTime: {
      type: DataTypes.DATE,
      field: 'process_end_time',
    },
    processResult: {
      type: DataTypes.TEXT,
      field: 'process_result',
    },
    reviewTime: {
      type: DataTypes.DATE,
      field: 'review_time',
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
    tableName: 'complaint_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_water_body_id',
        fields: ['water_body_id'],
      },
      {
        name: 'idx_region_id',
        fields: ['region_id'],
      },
      {
        name: 'idx_complaint_type',
        fields: ['complaint_type'],
      },
      {
        name: 'idx_order_status',
        fields: ['order_status'],
      },
      {
        name: 'idx_complaint_time',
        fields: ['complaint_time'],
      },
      {
        name: 'idx_priority',
        fields: ['priority'],
      },
      {
        name: 'idx_location',
        fields: ['location'],
        using: 'gist',
      },
    ],
  }
);

export default ComplaintOrder;
