import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { OutletType, DischargeMethod } from './enums';
import { WaterBody } from './WaterBody';

export interface ISewageOutletAttributes {
  outletId: number;
  outletCode: string;
  outletName: string;
  waterBodyId: number;
  outletType: OutletType;
  dischargeMethod?: DischargeMethod;
  designDischargeCapacity?: number;
  actualDischargeCapacity?: number;
  location: object;
  address?: string;
  dischargeStandard?: string;
  monitoringEquipment?: string;
  monitoringFrequency?: string;
  responsibleUnit?: string;
  contactPerson?: string;
  contactPhone?: string;
  nh3nLimit?: number;
  tpLimit?: number;
  codLimit?: number;
  isMonitored?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISewageOutletCreationAttributes extends Omit<ISewageOutletAttributes, 'outletId' | 'createdAt' | 'updatedAt'> {}

export class SewageOutlet extends Model<ISewageOutletAttributes, ISewageOutletCreationAttributes> implements ISewageOutletAttributes {
  public outletId!: number;
  public outletCode!: string;
  public outletName!: string;
  public waterBodyId!: number;
  public outletType!: OutletType;
  public dischargeMethod?: DischargeMethod;
  public designDischargeCapacity?: number;
  public actualDischargeCapacity?: number;
  public location!: object;
  public address?: string;
  public dischargeStandard?: string;
  public monitoringEquipment?: string;
  public monitoringFrequency?: string;
  public responsibleUnit?: string;
  public contactPerson?: string;
  public contactPhone?: string;
  public nh3nLimit?: number;
  public tpLimit?: number;
  public codLimit?: number;
  public isMonitored?: boolean;
  public isActive?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public waterBody?: WaterBody;
}

SewageOutlet.init(
  {
    outletId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'outlet_id',
    },
    outletCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'outlet_code',
    },
    outletName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'outlet_name',
    },
    waterBodyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'water_body_id',
      references: {
        model: 'water_bodies',
        key: 'water_body_id',
      },
    },
    outletType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'outlet_type',
    },
    dischargeMethod: {
      type: DataTypes.SMALLINT,
      field: 'discharge_method',
    },
    designDischargeCapacity: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'design_discharge_capacity',
    },
    actualDischargeCapacity: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'actual_discharge_capacity',
    },
    location: {
      type: DataTypes.GEOMETRY('Point', 4326),
      allowNull: false,
      field: 'location',
    },
    address: {
      type: DataTypes.STRING(200),
      field: 'address',
    },
    dischargeStandard: {
      type: DataTypes.STRING(50),
      field: 'discharge_standard',
    },
    monitoringEquipment: {
      type: DataTypes.STRING(200),
      field: 'monitoring_equipment',
    },
    monitoringFrequency: {
      type: DataTypes.STRING(50),
      field: 'monitoring_frequency',
    },
    responsibleUnit: {
      type: DataTypes.STRING(200),
      field: 'responsible_unit',
    },
    contactPerson: {
      type: DataTypes.STRING(50),
      field: 'contact_person',
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      field: 'contact_phone',
    },
    nh3nLimit: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'nh3n_limit',
    },
    tpLimit: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'tp_limit',
    },
    codLimit: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'cod_limit',
    },
    isMonitored: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_monitored',
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
    tableName: 'sewage_outlets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_water_body_id',
        fields: ['water_body_id'],
      },
      {
        name: 'idx_outlet_type',
        fields: ['outlet_type'],
      },
      {
        name: 'idx_is_monitored',
        fields: ['is_monitored'],
      },
      {
        name: 'idx_location',
        fields: ['location'],
        using: 'gist',
      },
    ],
  }
);

export default SewageOutlet;
