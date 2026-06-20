import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { MessageType, ReceiverType, PushStatus } from './enums';

export interface IMessagePushLogAttributes {
  pushId: number;
  messageType: MessageType;
  relatedId?: number;
  title: string;
  content: string;
  receiverType: ReceiverType;
  receiverIds?: number[];
  pushChannels?: string[];
  pushStatus?: PushStatus;
  pushTime?: Date;
  readStatus?: object;
  createdAt?: Date;
}

export interface IMessagePushLogCreationAttributes extends Omit<IMessagePushLogAttributes, 'pushId' | 'createdAt'> {}

export class MessagePushLog extends Model<IMessagePushLogAttributes, IMessagePushLogCreationAttributes> implements IMessagePushLogAttributes {
  public pushId!: number;
  public messageType!: MessageType;
  public relatedId?: number;
  public title!: string;
  public content!: string;
  public receiverType!: ReceiverType;
  public receiverIds?: number[];
  public pushChannels?: string[];
  public pushStatus?: PushStatus;
  public pushTime?: Date;
  public readStatus?: object;
  public readonly createdAt!: Date;
}

MessagePushLog.init(
  {
    pushId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'push_id',
    },
    messageType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'message_type',
    },
    relatedId: {
      type: DataTypes.INTEGER,
      field: 'related_id',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'title',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'content',
    },
    receiverType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'receiver_type',
    },
    receiverIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      field: 'receiver_ids',
    },
    pushChannels: {
      type: DataTypes.ARRAY(DataTypes.STRING(20)),
      field: 'push_channels',
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
    readStatus: {
      type: DataTypes.JSONB,
      field: 'read_status',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'message_push_logs',
    timestamps: false,
    createdAt: 'created_at',
    indexes: [
      {
        name: 'idx_message_type',
        fields: ['message_type'],
      },
      {
        name: 'idx_push_status',
        fields: ['push_status'],
      },
      {
        name: 'idx_created_at',
        fields: ['created_at'],
      },
    ],
  }
);

export default MessagePushLog;
