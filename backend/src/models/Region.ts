import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { RegionLevel } from './enums';
import { WaterBody } from './WaterBody';

export interface IRegionAttributes {
  regionId: number;
  regionCode: string;
  regionName: string;
  regionLevel: RegionLevel;
  parentId?: number;
  geom?: object;
  centerPoint?: object;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRegionCreationAttributes extends Omit<IRegionAttributes, 'regionId' | 'createdAt' | 'updatedAt'> {}

export class Region extends Model<IRegionAttributes, IRegionCreationAttributes> implements IRegionAttributes {
  public regionId!: number;
  public regionCode!: string;
  public regionName!: string;
  public regionLevel!: RegionLevel;
  public parentId?: number;
  public geom?: object;
  public centerPoint?: object;
  public sortOrder?: number;
  public isActive?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public waterBodies?: WaterBody[];
}

Region.init(
  {
    regionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'region_id',
    },
    regionCode: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true,
      field: 'region_code',
    },
    regionName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'region_name',
    },
    regionLevel: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'region_level',
      validate: {
        isIn: [[RegionLevel.NATIONAL, RegionLevel.PROVINCIAL, RegionLevel.MUNICIPAL]],
      },
    },
    parentId: {
      type: DataTypes.INTEGER,
      field: 'parent_id',
      references: {
        model: 'regions',
        key: 'region_id',
      },
    },
    geom: {
      type: DataTypes.GEOMETRY('MultiPolygon', 4326),
      field: 'geom',
    },
    centerPoint: {
      type: DataTypes.GEOMETRY('Point', 4326),
      field: 'center_point',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
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
    tableName: 'regions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_region_level',
        fields: ['region_level'],
      },
      {
        name: 'idx_parent_id',
        fields: ['parent_id'],
      },
      {
        name: 'idx_region_code',
        fields: ['region_code'],
      },
    ],
  }
);

export default Region;
