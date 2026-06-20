import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { ConfigType } from './enums';

export interface ISystemConfigAttributes {
  configId: number;
  configKey: string;
  configValue?: string;
  configType?: ConfigType;
  description?: string;
  isEditable?: boolean;
  updatedBy?: number;
  updatedAt?: Date;
}

export interface ISystemConfigCreationAttributes extends Omit<ISystemConfigAttributes, 'configId' | 'updatedAt'> {}

export class SystemConfig extends Model<ISystemConfigAttributes, ISystemConfigCreationAttributes> implements ISystemConfigAttributes {
  public configId!: number;
  public configKey!: string;
  public configValue?: string;
  public configType?: ConfigType;
  public description?: string;
  public isEditable?: boolean;
  public updatedBy?: number;
  public readonly updatedAt!: Date;
}

SystemConfig.init(
  {
    configId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'config_id',
    },
    configKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'config_key',
    },
    configValue: {
      type: DataTypes.TEXT,
      field: 'config_value',
    },
    configType: {
      type: DataTypes.STRING(20),
      defaultValue: ConfigType.STRING,
      field: 'config_type',
    },
    description: {
      type: DataTypes.STRING(500),
      field: 'description',
    },
    isEditable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_editable',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'system_configs',
    timestamps: false,
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_config_key',
        fields: ['config_key'],
      },
    ],
  }
);

export default SystemConfig;
