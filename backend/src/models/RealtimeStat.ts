import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { StatType, StatPeriod } from './enums';

export interface IRealtimeStatAttributes {
  statId: number;
  statType: StatType;
  regionId?: number;
  waterBodyId?: number;
  outletId?: number;
  projectId?: number;
  statDate: Date;
  statPeriod?: StatPeriod;
  waterQualityComplianceRate?: number;
  governanceCompletionRate?: number;
  publicSatisfaction?: number;
  outletAbnormalityIndex?: number;
  overproofCount?: number;
  totalMonitorCount?: number;
  complaintCount?: number;
  completedProjectCount?: number;
  totalProjectCount?: number;
  alertCount?: number;
  additionalData?: object;
  calculatedAt?: Date;
  createdAt?: Date;
}

export interface IRealtimeStatCreationAttributes extends Omit<IRealtimeStatAttributes, 'statId' | 'calculatedAt' | 'createdAt'> {}

export class RealtimeStat extends Model<IRealtimeStatAttributes, IRealtimeStatCreationAttributes> implements IRealtimeStatAttributes {
  public statId!: number;
  public statType!: StatType;
  public regionId?: number;
  public waterBodyId?: number;
  public outletId?: number;
  public projectId?: number;
  public statDate!: Date;
  public statPeriod?: StatPeriod;
  public waterQualityComplianceRate?: number;
  public governanceCompletionRate?: number;
  public publicSatisfaction?: number;
  public outletAbnormalityIndex?: number;
  public overproofCount?: number;
  public totalMonitorCount?: number;
  public complaintCount?: number;
  public completedProjectCount?: number;
  public totalProjectCount?: number;
  public alertCount?: number;
  public additionalData?: object;
  public readonly calculatedAt!: Date;
  public readonly createdAt!: Date;
}

RealtimeStat.init(
  {
    statId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'stat_id',
    },
    statType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'stat_type',
    },
    regionId: {
      type: DataTypes.INTEGER,
      field: 'region_id',
      references: {
        model: 'regions',
        key: 'region_id',
      },
    },
    waterBodyId: {
      type: DataTypes.INTEGER,
      field: 'water_body_id',
      references: {
        model: 'water_bodies',
        key: 'water_body_id',
      },
    },
    outletId: {
      type: DataTypes.INTEGER,
      field: 'outlet_id',
      references: {
        model: 'sewage_outlets',
        key: 'outlet_id',
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
    statDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'stat_date',
    },
    statPeriod: {
      type: DataTypes.STRING(10),
      field: 'stat_period',
    },
    waterQualityComplianceRate: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'water_quality_compliance_rate',
    },
    governanceCompletionRate: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'governance_completion_rate',
    },
    publicSatisfaction: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'public_satisfaction',
    },
    outletAbnormalityIndex: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'outlet_abnormality_index',
    },
    overproofCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'overproof_count',
    },
    totalMonitorCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_monitor_count',
    },
    complaintCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'complaint_count',
    },
    completedProjectCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'completed_project_count',
    },
    totalProjectCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_project_count',
    },
    alertCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'alert_count',
    },
    additionalData: {
      type: DataTypes.JSONB,
      field: 'additional_data',
    },
    calculatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'calculated_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'realtime_stats',
    timestamps: false,
    createdAt: 'created_at',
    indexes: [
      {
        name: 'realtime_stats_stat_type_region_id_water_body_id_outlet_id_project_key',
        fields: ['stat_type', 'region_id', 'water_body_id', 'outlet_id', 'project_id', 'stat_date', 'stat_period'],
        unique: true,
      },
      {
        name: 'idx_stat_type_date',
        fields: ['stat_type', 'stat_date', 'region_id'],
      },
    ],
  }
);

export default RealtimeStat;
