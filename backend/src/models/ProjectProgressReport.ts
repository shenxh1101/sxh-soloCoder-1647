import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { ReportStatus } from './enums';

export interface IProjectProgressReportAttributes {
  reportId: number;
  projectId: number;
  reportPeriod: string;
  reportDate: Date;
  monthlyPlanContent?: string;
  monthlyActualContent?: string;
  monthlyPlannedProgress?: number;
  monthlyActualProgress?: number;
  cumulativePlannedProgress?: number;
  cumulativeActualProgress?: number;
  monthlyInvestmentPlan?: number;
  monthlyActualInvestment?: number;
  cumulativeInvestment?: number;
  constructionPersonnel?: number;
  equipmentCount?: number;
  existingProblems?: string;
  nextMonthPlan?: string;
  supportNeeded?: string;
  attachments?: object;
  reportStatus?: ReportStatus;
  submittedBy?: number;
  submittedAt?: Date;
  reviewedBy?: number;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProjectProgressReportCreationAttributes extends Omit<IProjectProgressReportAttributes, 'reportId' | 'createdAt' | 'updatedAt'> {}

export class ProjectProgressReport extends Model<IProjectProgressReportAttributes, IProjectProgressReportCreationAttributes> implements IProjectProgressReportAttributes {
  public reportId!: number;
  public projectId!: number;
  public reportPeriod!: string;
  public reportDate!: Date;
  public monthlyPlanContent?: string;
  public monthlyActualContent?: string;
  public monthlyPlannedProgress?: number;
  public monthlyActualProgress?: number;
  public cumulativePlannedProgress?: number;
  public cumulativeActualProgress?: number;
  public monthlyInvestmentPlan?: number;
  public monthlyActualInvestment?: number;
  public cumulativeInvestment?: number;
  public constructionPersonnel?: number;
  public equipmentCount?: number;
  public existingProblems?: string;
  public nextMonthPlan?: string;
  public supportNeeded?: string;
  public attachments?: object;
  public reportStatus?: ReportStatus;
  public submittedBy?: number;
  public submittedAt?: Date;
  public reviewedBy?: number;
  public reviewedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProjectProgressReport.init(
  {
    reportId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'report_id',
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'project_id',
      references: {
        model: 'governance_projects',
        key: 'project_id',
      },
    },
    reportPeriod: {
      type: DataTypes.STRING(7),
      allowNull: false,
      field: 'report_period',
    },
    reportDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'report_date',
    },
    monthlyPlanContent: {
      type: DataTypes.TEXT,
      field: 'monthly_plan_content',
    },
    monthlyActualContent: {
      type: DataTypes.TEXT,
      field: 'monthly_actual_content',
    },
    monthlyPlannedProgress: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'monthly_planned_progress',
    },
    monthlyActualProgress: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'monthly_actual_progress',
    },
    cumulativePlannedProgress: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'cumulative_planned_progress',
    },
    cumulativeActualProgress: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'cumulative_actual_progress',
    },
    monthlyInvestmentPlan: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'monthly_investment_plan',
    },
    monthlyActualInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'monthly_actual_investment',
    },
    cumulativeInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'cumulative_investment',
    },
    constructionPersonnel: {
      type: DataTypes.INTEGER,
      field: 'construction_personnel',
    },
    equipmentCount: {
      type: DataTypes.INTEGER,
      field: 'equipment_count',
    },
    existingProblems: {
      type: DataTypes.TEXT,
      field: 'existing_problems',
    },
    nextMonthPlan: {
      type: DataTypes.TEXT,
      field: 'next_month_plan',
    },
    supportNeeded: {
      type: DataTypes.TEXT,
      field: 'support_needed',
    },
    attachments: {
      type: DataTypes.JSONB,
      field: 'attachments',
    },
    reportStatus: {
      type: DataTypes.SMALLINT,
      defaultValue: ReportStatus.DRAFT,
      field: 'report_status',
    },
    submittedBy: {
      type: DataTypes.INTEGER,
      field: 'submitted_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    submittedAt: {
      type: DataTypes.DATE,
      field: 'submitted_at',
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      field: 'reviewed_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at',
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
    tableName: 'project_progress_reports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'project_progress_reports_project_id_report_period_key',
        fields: ['project_id', 'report_period'],
        unique: true,
      },
      {
        name: 'idx_project_period',
        fields: ['project_id', 'report_period'],
      },
      {
        name: 'idx_report_status',
        fields: ['report_status'],
      },
    ],
  }
);

export default ProjectProgressReport;
