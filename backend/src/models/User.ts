import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { UserLevel, UserRole } from './enums';

export interface IUserAttributes {
  userId: number;
  username: string;
  passwordHash: string;
  realName: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  userLevel: UserLevel;
  regionId: number;
  role?: UserRole;
  permissions?: object;
  isActive?: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordChangedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: number;
}

export interface IUserCreationAttributes extends Omit<IUserAttributes, 'userId' | 'createdAt' | 'updatedAt'> {}

export class User extends Model<IUserAttributes, IUserCreationAttributes> implements IUserAttributes {
  public userId!: number;
  public username!: string;
  public passwordHash!: string;
  public realName!: string;
  public phone?: string;
  public email?: string;
  public department?: string;
  public position?: string;
  public userLevel!: UserLevel;
  public regionId!: number;
  public role?: UserRole;
  public permissions?: object;
  public isActive?: boolean;
  public lastLoginAt?: Date;
  public lastLoginIp?: string;
  public passwordChangedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public createdBy?: number;
}

User.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'user_id',
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'username',
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    realName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'real_name',
    },
    phone: {
      type: DataTypes.STRING(20),
      field: 'phone',
    },
    email: {
      type: DataTypes.STRING(100),
      field: 'email',
    },
    department: {
      type: DataTypes.STRING(100),
      field: 'department',
    },
    position: {
      type: DataTypes.STRING(50),
      field: 'position',
    },
    userLevel: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'user_level',
      validate: {
        isIn: [[UserLevel.NATIONAL, UserLevel.PROVINCIAL, UserLevel.MUNICIPAL]],
      },
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
    role: {
      type: DataTypes.STRING(20),
      defaultValue: UserRole.VIEWER,
      field: 'role',
    },
    permissions: {
      type: DataTypes.JSONB,
      field: 'permissions',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at',
    },
    lastLoginIp: {
      type: DataTypes.STRING(45),
      field: 'last_login_ip',
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      field: 'password_changed_at',
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
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_user_level',
        fields: ['user_level'],
      },
      {
        name: 'idx_region_id',
        fields: ['region_id'],
      },
      {
        name: 'idx_username',
        fields: ['username'],
      },
      {
        name: 'idx_role',
        fields: ['role'],
      },
    ],
  }
);

export default User;
