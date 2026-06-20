import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { WaterBodyType, WaterBodyLevel, GovernanceStage, WaterBodyStatus } from './enums';

export interface IWaterBodyAttributes {
  waterBodyId: number;
  waterBodyCode: string;
  waterBodyName: string;
  waterBodyType: WaterBodyType;
  waterBodyLevel: WaterBodyLevel;
  regionId: number;
  administrativeVillage?: string;
  startPoint?: object;
  endPoint?: object;
  waterLength?: number;
  waterArea?: number;
  catchmentArea?: number;
  surroundingPopulation?: number;
  governanceStage?: GovernanceStage;
  currentStatus?: WaterBodyStatus;
  plannedCompletionDate?: Date;
  actualCompletionDate?: Date;
  totalInvestment?: number;
  usedFunds?: number;
  responsibleUnit?: string;
  responsiblePerson?: string;
  responsiblePhone?: string;
  governanceMeasures?: string[];
  geom?: object;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWaterBodyCreationAttributes extends Omit<IWaterBodyAttributes, 'waterBodyId' | 'createdAt' | 'updatedAt'> {}

export class WaterBody extends Model<IWaterBodyAttributes, IWaterBodyCreationAttributes> implements IWaterBodyAttributes {
  public waterBodyId!: number;
  public waterBodyCode!: string;
  public waterBodyName!: string;
  public waterBodyType!: WaterBodyType;
  public waterBodyLevel!: WaterBodyLevel;
  public regionId!: number;
  public administrativeVillage?: string;
  public startPoint?: object;
  public endPoint?: object;
  public waterLength?: number;
  public waterArea?: number;
  public catchmentArea?: number;
  public surroundingPopulation?: number;
  public governanceStage?: GovernanceStage;
  public currentStatus?: WaterBodyStatus;
  public plannedCompletionDate?: Date;
  public actualCompletionDate?: Date;
  public totalInvestment?: number;
  public usedFunds?: number;
  public responsibleUnit?: string;
  public responsiblePerson?: string;
  public responsiblePhone?: string;
  public governanceMeasures?: string[];
  public geom?: object;
  public isActive?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WaterBody.init(
  {
    waterBodyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'water_body_id',
    },
    waterBodyCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'water_body_code',
    },
    waterBodyName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'water_body_name',
    },
    waterBodyType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'water_body_type',
    },
    waterBodyLevel: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'water_body_level',
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
    administrativeVillage: {
      type: DataTypes.STRING(100),
      field: 'administrative_village',
    },
    startPoint: {
      type: DataTypes.GEOMETRY('Point', 4326),
      field: 'start_point',
    },
    endPoint: {
      type: DataTypes.GEOMETRY('Point', 4326),
      field: 'end_point',
    },
    waterLength: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'water_length',
    },
    waterArea: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'water_area',
    },
    catchmentArea: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'catchment_area',
    },
    surroundingPopulation: {
      type: DataTypes.INTEGER,
      field: 'surrounding_population',
    },
    governanceStage: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: GovernanceStage.PLAN_FORMULATION,
      field: 'governance_stage',
    },
    currentStatus: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: WaterBodyStatus.UNDER_GOVERNANCE,
      field: 'current_status',
    },
    plannedCompletionDate: {
      type: DataTypes.DATEONLY,
      field: 'planned_completion_date',
    },
    actualCompletionDate: {
      type: DataTypes.DATEONLY,
      field: 'actual_completion_date',
    },
    totalInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'total_investment',
    },
    usedFunds: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'used_funds',
    },
    responsibleUnit: {
      type: DataTypes.STRING(200),
      field: 'responsible_unit',
    },
    responsiblePerson: {
      type: DataTypes.STRING(50),
      field: 'responsible_person',
    },
    responsiblePhone: {
      type: DataTypes.STRING(20),
      field: 'responsible_phone',
    },
    governanceMeasures: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: 'governance_measures',
    },
    geom: {
      type: DataTypes.GEOMETRY('LineString', 4326),
      field: 'geom',
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
    tableName: 'water_bodies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_region_id',
        fields: ['region_id'],
      },
      {
        name: 'idx_water_body_level',
        fields: ['water_body_level'],
      },
      {
        name: 'idx_governance_stage',
        fields: ['governance_stage'],
      },
      {
        name: 'idx_current_status',
        fields: ['current_status'],
      },
      {
        name: 'idx_water_body_code',
        fields: ['water_body_code'],
      },
      {
        name: 'idx_geom',
        fields: ['geom'],
        using: 'gist',
      },
    ],
  }
);

export default WaterBody;
