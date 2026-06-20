import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { AssessmentType, AssessmentLevel } from './enums';

export interface IEcologicalAssessmentAttributes {
  assessmentId: number;
  assessmentCode: string;
  waterBodyId: number;
  assessmentType: AssessmentType;
  assessmentDate: Date;
  assessmentPeriod?: string;
  waterQualityScore?: number;
  ecologicalIndex?: number;
  landscapeScore?: number;
  managementScore?: number;
  comprehensiveScore?: number;
  assessmentLevel?: AssessmentLevel;
  biodiversityIndex?: number;
  vegetationCoverage?: number;
  habitatQuality?: number;
  waterEnvironmentCapacity?: number;
  existingProblems?: string;
  improvementSuggestions?: string;
  assessmentOrganization?: string;
  assessmentExperts?: string;
  assessmentReportUrl?: string;
  assessorId?: number;
  isApproved?: boolean;
  approvedBy?: number;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEcologicalAssessmentCreationAttributes extends Omit<IEcologicalAssessmentAttributes, 'assessmentId' | 'createdAt' | 'updatedAt'> {}

export class EcologicalAssessment extends Model<IEcologicalAssessmentAttributes, IEcologicalAssessmentCreationAttributes> implements IEcologicalAssessmentAttributes {
  public assessmentId!: number;
  public assessmentCode!: string;
  public waterBodyId!: number;
  public assessmentType!: AssessmentType;
  public assessmentDate!: Date;
  public assessmentPeriod?: string;
  public waterQualityScore?: number;
  public ecologicalIndex?: number;
  public landscapeScore?: number;
  public managementScore?: number;
  public comprehensiveScore?: number;
  public assessmentLevel?: AssessmentLevel;
  public biodiversityIndex?: number;
  public vegetationCoverage?: number;
  public habitatQuality?: number;
  public waterEnvironmentCapacity?: number;
  public existingProblems?: string;
  public improvementSuggestions?: string;
  public assessmentOrganization?: string;
  public assessmentExperts?: string;
  public assessmentReportUrl?: string;
  public assessorId?: number;
  public isApproved?: boolean;
  public approvedBy?: number;
  public approvedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EcologicalAssessment.init(
  {
    assessmentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'assessment_id',
    },
    assessmentCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'assessment_code',
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
    assessmentType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'assessment_type',
    },
    assessmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'assessment_date',
    },
    assessmentPeriod: {
      type: DataTypes.STRING(20),
      field: 'assessment_period',
    },
    waterQualityScore: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'water_quality_score',
    },
    ecologicalIndex: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'ecological_index',
    },
    landscapeScore: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'landscape_score',
    },
    managementScore: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'management_score',
    },
    comprehensiveScore: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'comprehensive_score',
    },
    assessmentLevel: {
      type: DataTypes.STRING(10),
      field: 'assessment_level',
    },
    biodiversityIndex: {
      type: DataTypes.DECIMAL(8, 4),
      field: 'biodiversity_index',
    },
    vegetationCoverage: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'vegetation_coverage',
    },
    habitatQuality: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'habitat_quality',
    },
    waterEnvironmentCapacity: {
      type: DataTypes.DECIMAL(10, 4),
      field: 'water_environment_capacity',
    },
    existingProblems: {
      type: DataTypes.TEXT,
      field: 'existing_problems',
    },
    improvementSuggestions: {
      type: DataTypes.TEXT,
      field: 'improvement_suggestions',
    },
    assessmentOrganization: {
      type: DataTypes.STRING(200),
      field: 'assessment_organization',
    },
    assessmentExperts: {
      type: DataTypes.STRING(500),
      field: 'assessment_experts',
    },
    assessmentReportUrl: {
      type: DataTypes.STRING(500),
      field: 'assessment_report_url',
    },
    assessorId: {
      type: DataTypes.INTEGER,
      field: 'assessor_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_approved',
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      field: 'approved_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    approvedAt: {
      type: DataTypes.DATE,
      field: 'approved_at',
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
    tableName: 'ecological_assessments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_water_body_id',
        fields: ['water_body_id'],
      },
      {
        name: 'idx_assessment_type',
        fields: ['assessment_type'],
      },
      {
        name: 'idx_assessment_date',
        fields: ['assessment_date'],
      },
      {
        name: 'idx_assessment_level',
        fields: ['assessment_level'],
      },
    ],
  }
);

export default EcologicalAssessment;
