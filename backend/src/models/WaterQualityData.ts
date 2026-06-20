import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { DataQuality } from './enums';

export interface IWaterQualityDataAttributes {
  dataId: number;
  outletId: number;
  monitorTime: Date;
  waterTemperature?: number;
  phValue?: number;
  dissolvedOxygen?: number;
  ammoniaNitrogen?: number;
  totalPhosphorus?: number;
  totalNitrogen?: number;
  cod?: number;
  bod5?: number;
  transparency?: number;
  oxidationReductionPotential?: number;
  conductivity?: number;
  turbidity?: number;
  flowRate?: number;
  isNh3nOverproof?: boolean;
  isTpOverproof?: boolean;
  isCompliant?: boolean;
  dataQuality?: DataQuality;
  rawData?: object;
  createdAt?: Date;
}

export interface IWaterQualityDataCreationAttributes extends Omit<IWaterQualityDataAttributes, 'dataId' | 'createdAt'> {}

export class WaterQualityData extends Model<IWaterQualityDataAttributes, IWaterQualityDataCreationAttributes> implements IWaterQualityDataAttributes {
  public dataId!: number;
  public outletId!: number;
  public monitorTime!: Date;
  public waterTemperature?: number;
  public phValue?: number;
  public dissolvedOxygen?: number;
  public ammoniaNitrogen?: number;
  public totalPhosphorus?: number;
  public totalNitrogen?: number;
  public cod?: number;
  public bod5?: number;
  public transparency?: number;
  public oxidationReductionPotential?: number;
  public conductivity?: number;
  public turbidity?: number;
  public flowRate?: number;
  public isNh3nOverproof?: boolean;
  public isTpOverproof?: boolean;
  public isCompliant?: boolean;
  public dataQuality?: DataQuality;
  public rawData?: object;
  public readonly createdAt!: Date;
}

WaterQualityData.init(
  {
    dataId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'data_id',
    },
    outletId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'outlet_id',
      references: {
        model: 'sewage_outlets',
        key: 'outlet_id',
      },
    },
    monitorTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'monitor_time',
    },
    waterTemperature: {
      type: DataTypes.DECIMAL(6, 2),
      field: 'water_temperature',
    },
    phValue: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'ph_value',
    },
    dissolvedOxygen: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'dissolved_oxygen',
    },
    ammoniaNitrogen: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'ammonia_nitrogen',
    },
    totalPhosphorus: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'total_phosphorus',
    },
    totalNitrogen: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'total_nitrogen',
    },
    cod: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'cod',
    },
    bod5: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'bod5',
    },
    transparency: {
      type: DataTypes.DECIMAL(8, 2),
      field: 'transparency',
    },
    oxidationReductionPotential: {
      type: DataTypes.DECIMAL(8, 2),
      field: 'oxidation_reduction_potential',
    },
    conductivity: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'conductivity',
    },
    turbidity: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'turbidity',
    },
    flowRate: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'flow_rate',
    },
    isNh3nOverproof: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_nh3n_overproof',
    },
    isTpOverproof: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_tp_overproof',
    },
    isCompliant: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_compliant',
    },
    dataQuality: {
      type: DataTypes.SMALLINT,
      defaultValue: DataQuality.VALID,
      field: 'data_quality',
    },
    rawData: {
      type: DataTypes.JSONB,
      field: 'raw_data',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'water_quality_data',
    timestamps: false,
    createdAt: 'created_at',
    indexes: [
      {
        name: 'idx_outlet_time',
        fields: ['outlet_id', 'monitor_time'],
      },
      {
        name: 'idx_monitor_time',
        fields: ['monitor_time'],
      },
      {
        name: 'idx_is_nh3n_overproof',
        fields: ['is_nh3n_overproof'],
      },
      {
        name: 'idx_is_tp_overproof',
        fields: ['is_tp_overproof'],
      },
      {
        name: 'idx_is_compliant',
        fields: ['is_compliant'],
      },
      {
        name: 'idx_data_quality',
        fields: ['data_quality'],
      },
    ],
  }
);

export default WaterQualityData;
