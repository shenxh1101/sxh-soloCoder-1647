import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';
import { WorkflowType, WorkflowStage, WorkflowStatus, ApprovalResult } from './enums';

export interface IApprovalWorkflowAttributes {
  workflowId: number;
  workflowCode: string;
  workflowType: WorkflowType;
  relatedAlertId?: number;
  projectId?: number;
  waterBodyId?: number;
  regionId?: number;
  applicantId: number;
  applicantUnit?: string;
  applicationContent: string;
  applicationReason: string;
  proposedScheme?: string;
  expectedEffect?: string;
  attachments?: object;
  currentStage?: WorkflowStage;
  workflowStatus?: WorkflowStatus;
  stage1Handler?: number;
  stage1Opinion?: string;
  stage1Result?: ApprovalResult;
  stage1Time?: Date;
  stage2Handler?: number;
  stage2Opinion?: string;
  stage2Result?: ApprovalResult;
  stage2Time?: Date;
  stage3Handler?: number;
  stage3Opinion?: string;
  stage3Result?: ApprovalResult;
  stage3Time?: Date;
  finalResult?: string;
  finalTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IApprovalWorkflowCreationAttributes extends Omit<IApprovalWorkflowAttributes, 'workflowId' | 'createdAt' | 'updatedAt'> {}

export class ApprovalWorkflow extends Model<IApprovalWorkflowAttributes, IApprovalWorkflowCreationAttributes> implements IApprovalWorkflowAttributes {
  public workflowId!: number;
  public workflowCode!: string;
  public workflowType!: WorkflowType;
  public relatedAlertId?: number;
  public projectId?: number;
  public waterBodyId?: number;
  public regionId?: number;
  public applicantId!: number;
  public applicantUnit?: string;
  public applicationContent!: string;
  public applicationReason!: string;
  public proposedScheme?: string;
  public expectedEffect?: string;
  public attachments?: object;
  public currentStage?: WorkflowStage;
  public workflowStatus?: WorkflowStatus;
  public stage1Handler?: number;
  public stage1Opinion?: string;
  public stage1Result?: ApprovalResult;
  public stage1Time?: Date;
  public stage2Handler?: number;
  public stage2Opinion?: string;
  public stage2Result?: ApprovalResult;
  public stage2Time?: Date;
  public stage3Handler?: number;
  public stage3Opinion?: string;
  public stage3Result?: ApprovalResult;
  public stage3Time?: Date;
  public finalResult?: string;
  public finalTime?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ApprovalWorkflow.init(
  {
    workflowId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'workflow_id',
    },
    workflowCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'workflow_code',
    },
    workflowType: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: 'workflow_type',
    },
    relatedAlertId: {
      type: DataTypes.INTEGER,
      field: 'related_alert_id',
      references: {
        model: 'alerts',
        key: 'alert_id',
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
    waterBodyId: {
      type: DataTypes.INTEGER,
      field: 'water_body_id',
      references: {
        model: 'water_bodies',
        key: 'water_body_id',
      },
    },
    regionId: {
      type: DataTypes.INTEGER,
      field: 'region_id',
      references: {
        model: 'regions',
        key: 'region_id',
      },
    },
    applicantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'applicant_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    applicantUnit: {
      type: DataTypes.STRING(200),
      field: 'applicant_unit',
    },
    applicationContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'application_content',
    },
    applicationReason: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'application_reason',
    },
    proposedScheme: {
      type: DataTypes.TEXT,
      field: 'proposed_scheme',
    },
    expectedEffect: {
      type: DataTypes.TEXT,
      field: 'expected_effect',
    },
    attachments: {
      type: DataTypes.JSONB,
      field: 'attachments',
    },
    currentStage: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: WorkflowStage.STAGE_1_PENDING,
      field: 'current_stage',
    },
    workflowStatus: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: WorkflowStatus.IN_PROGRESS,
      field: 'workflow_status',
    },
    stage1Handler: {
      type: DataTypes.INTEGER,
      field: 'stage1_handler',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    stage1Opinion: {
      type: DataTypes.TEXT,
      field: 'stage1_opinion',
    },
    stage1Result: {
      type: DataTypes.SMALLINT,
      field: 'stage1_result',
    },
    stage1Time: {
      type: DataTypes.DATE,
      field: 'stage1_time',
    },
    stage2Handler: {
      type: DataTypes.INTEGER,
      field: 'stage2_handler',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    stage2Opinion: {
      type: DataTypes.TEXT,
      field: 'stage2_opinion',
    },
    stage2Result: {
      type: DataTypes.SMALLINT,
      field: 'stage2_result',
    },
    stage2Time: {
      type: DataTypes.DATE,
      field: 'stage2_time',
    },
    stage3Handler: {
      type: DataTypes.INTEGER,
      field: 'stage3_handler',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    stage3Opinion: {
      type: DataTypes.TEXT,
      field: 'stage3_opinion',
    },
    stage3Result: {
      type: DataTypes.SMALLINT,
      field: 'stage3_result',
    },
    stage3Time: {
      type: DataTypes.DATE,
      field: 'stage3_time',
    },
    finalResult: {
      type: DataTypes.TEXT,
      field: 'final_result',
    },
    finalTime: {
      type: DataTypes.DATE,
      field: 'final_time',
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
    tableName: 'approval_workflows',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_workflow_type',
        fields: ['workflow_type'],
      },
      {
        name: 'idx_current_stage',
        fields: ['current_stage'],
      },
      {
        name: 'idx_workflow_status',
        fields: ['workflow_status'],
      },
      {
        name: 'idx_related_alert',
        fields: ['related_alert_id'],
      },
      {
        name: 'idx_region_id',
        fields: ['region_id'],
      },
      {
        name: 'idx_water_body_id',
        fields: ['water_body_id'],
      },
    ],
  }
);

export default ApprovalWorkflow;
