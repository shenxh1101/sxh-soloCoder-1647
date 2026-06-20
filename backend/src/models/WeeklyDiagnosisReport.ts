import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';

export interface IWeeklyDiagnosisReportAttributes {
  reportId: number;
  reportCode: string;
  reportWeek: number;
  reportYear: number;
  startDate: Date;
  endDate: Date;
  regionId: number;
  waterQualityComplianceRate?: number;
  qoqComplianceRate?: number;
  yoyComplianceRate?: number;
  governanceCompletionRate?: number;
  qoqCompletionRate?: number;
  yoyCompletionRate?: number;
  publicSatisfaction?: number;
  qoqSatisfaction?: number;
  yoySatisfaction?: number;
  complaintTypeDistribution?: object;
  projectDelayAnalysis?: object;
  trendAnalysis?: string;
  technicalRouteRecommendations?: string;
  fundAllocationScheme?: string;
  keyProblems?: string;
  reportContent?: object;
  reportFileUrl?: string;
  generatedAt?: Date;
  generatedBy?: number;
  createdAt?: Date;
}

export interface IWeeklyDiagnosisReportCreationAttributes extends Omit<IWeeklyDiagnosisReportAttributes, 'reportId' | 'generatedAt' | 'createdAt'> {}

export class WeeklyDiagnosisReport extends Model<IWeeklyDiagnosisReportAttributes, IWeeklyDiagnosisReportCreationAttributes> implements IWeeklyDiagnosisReportAttributes {
  public reportId!: number;
  public reportCode!: string;
  public reportWeek!: number;
  public reportYear!: number;
  public startDate!: Date;
  public endDate!: Date;
  public regionId!: number;
  public waterQualityComplianceRate?: number;
  public qoqComplianceRate?: number;
  public yoyComplianceRate?: number;
  public governanceCompletionRate?: number;
  public qoqCompletionRate?: number;
  public yoyCompletionRate?: number;
  public publicSatisfaction?: number;
  public qoqSatisfaction?: number;
  public yoySatisfaction?: number;
  public complaintTypeDistribution?: object;
  public projectDelayAnalysis?: object;
  public trendAnalysis?: string;
  public technicalRouteRecommendations?: string;
  public fundAllocationScheme?: string;
  public keyProblems?: string;
  public reportContent?: object;
  public reportFileUrl?: string;
  public readonly generatedAt!: Date;
  public generatedBy?: number;
  public readonly createdAt!: Date;
}

WeeklyDiagnosisReport.init(
  {
    reportId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'report_id',
    },
    reportCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'report_code',
    },
    reportWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'report_week',
    },
    reportYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'report_year',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'end_date',
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
    waterQualityComplianceRate: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'water_quality_compliance_rate',
    },
    qoqComplianceRate: {
      type: DataTypes.DECIMAL(6, 2),
      field: 'qoq_compliance_rate',
    },
    yoyComplianceRate: {
      type: DataTypes.DECIMAL(6, 2),
      field: 'yoy_compliance_rate',
    },
    governanceCompletionRate: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'governance_completion_rate',
    },
    qoqCompletionRate: {
      type: DataTypes.DECIMAL(6, 2),
      field: 'qoq_completion_rate',
    },
    yoyCompletionRate: {
      type: DataTypes.DECIMAL(6, 2),
      field: 'yoy_completion_rate',
    },
    publicSatisfaction: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'public_satisfaction',
    },
    qoqSatisfaction: {
      type: DataTypes.DECIMAL(6, 2),
      field: 'qoq_satisfaction',
    },
    yoySatisfaction: {
      type: DataTypes.DECIMAL(6, 2),
      field: 'yoy_satisfaction',
    },
    complaintTypeDistribution: {
      type: DataTypes.JSONB,
      field: 'complaint_type_distribution',
    },
    projectDelayAnalysis: {
      type: DataTypes.JSONB,
      field: 'project_delay_analysis',
    },
    trendAnalysis: {
      type: DataTypes.TEXT,
      field: 'trend_analysis',
    },
    technicalRouteRecommendations: {
      type: DataTypes.TEXT,
      field: 'technical_route_recommendations',
    },
    fundAllocationScheme: {
      type: DataTypes.TEXT,
      field: 'fund_allocation_scheme',
    },
    keyProblems: {
      type: DataTypes.TEXT,
      field: 'key_problems',
    },
    reportContent: {
      type: DataTypes.JSONB,
      field: 'report_content',
    },
    reportFileUrl: {
      type: DataTypes.STRING(500),
      field: 'report_file_url',
    },
    generatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'generated_at',
    },
    generatedBy: {
      type: DataTypes.INTEGER,
      field: 'generated_by',
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
    tableName: 'weekly_diagnosis_reports',
    timestamps: false,
    createdAt: 'created_at',
    indexes: [
      {
        name: 'idx_year_week_region',
        fields: ['report_year', 'report_week', 'region_id'],
      },
    ],
  }
);

export default WeeklyDiagnosisReport;
