import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { ProjectType, ProjectStatus, QualityStatus } from './enums';
import { WaterBody } from './WaterBody';

export interface IGovernanceProjectAttributes {
  projectId: number;
  projectCode: string;
  projectName: string;
  waterBodyId: number;
  projectType: ProjectType;
  projectScale?: string;
  technologyType?: string;
  contractor?: string;
  supervisionUnit?: string;
  designUnit?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  plannedInvestment?: number;
  approvedBudget?: number;
  actualPayment?: number;
  plannedProgress?: number;
  actualProgress?: number;
  progressDeviation?: number;
  projectStatus?: ProjectStatus;
  qualityStatus?: QualityStatus;
  mainProblems?: string;
  isKeyProject?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGovernanceProjectCreationAttributes extends Omit<IGovernanceProjectAttributes, 'projectId' | 'createdAt' | 'updatedAt'> {}

export class GovernanceProject extends Model<IGovernanceProjectAttributes, IGovernanceProjectCreationAttributes> implements IGovernanceProjectAttributes {
  public projectId!: number;
  public projectCode!: string;
  public projectName!: string;
  public waterBodyId!: number;
  public projectType!: ProjectType;
  public projectScale?: string;
  public technologyType?: string;
  public contractor?: string;
  public supervisionUnit?: string;
  public designUnit?: string;
  public plannedStartDate?: Date;
  public plannedEndDate?: Date;
  public actualStartDate?: Date;
  public actualEndDate?: Date;
  public plannedInvestment?: number;
  public approvedBudget?: number;
  public actualPayment?: number;
  public plannedProgress?: number;
  public actualProgress?: number;
  public progressDeviation?: number;
  public projectStatus?: ProjectStatus;
  public qualityStatus?: QualityStatus;
  public mainProblems?: string;
  public isKeyProject?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public waterBody?: WaterBody;
}

GovernanceProject.init(
  {
    projectId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'project_id',
    },
    projectCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'project_code',
    },
    projectName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'project_name',
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
    projectType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'project_type',
    },
    projectScale: {
      type: DataTypes.TEXT,
      field: 'project_scale',
    },
    technologyType: {
      type: DataTypes.STRING(100),
      field: 'technology_type',
    },
    contractor: {
      type: DataTypes.STRING(200),
      field: 'contractor',
    },
    supervisionUnit: {
      type: DataTypes.STRING(200),
      field: 'supervision_unit',
    },
    designUnit: {
      type: DataTypes.STRING(200),
      field: 'design_unit',
    },
    plannedStartDate: {
      type: DataTypes.DATEONLY,
      field: 'planned_start_date',
    },
    plannedEndDate: {
      type: DataTypes.DATEONLY,
      field: 'planned_end_date',
    },
    actualStartDate: {
      type: DataTypes.DATEONLY,
      field: 'actual_start_date',
    },
    actualEndDate: {
      type: DataTypes.DATEONLY,
      field: 'actual_end_date',
    },
    plannedInvestment: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'planned_investment',
    },
    approvedBudget: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'approved_budget',
    },
    actualPayment: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'actual_payment',
    },
    plannedProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'planned_progress',
    },
    actualProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'actual_progress',
    },
    progressDeviation: {
      type: DataTypes.DECIMAL(6, 2),
      defaultValue: 0,
      field: 'progress_deviation',
    },
    projectStatus: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: ProjectStatus.NOT_STARTED,
      field: 'project_status',
    },
    qualityStatus: {
      type: DataTypes.SMALLINT,
      field: 'quality_status',
    },
    mainProblems: {
      type: DataTypes.TEXT,
      field: 'main_problems',
    },
    isKeyProject: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_key_project',
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
    tableName: 'governance_projects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_water_body_id',
        fields: ['water_body_id'],
      },
      {
        name: 'idx_project_type',
        fields: ['project_type'],
      },
      {
        name: 'idx_project_status',
        fields: ['project_status'],
      },
      {
        name: 'idx_progress_deviation',
        fields: ['progress_deviation'],
      },
    ],
  }
);

export default GovernanceProject;
