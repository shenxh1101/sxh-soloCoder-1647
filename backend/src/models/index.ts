import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { Dialect } from 'sequelize';
import { Region } from './Region';
import { User } from './User';
import { WaterBody } from './WaterBody';
import { SewageOutlet } from './SewageOutlet';
import { WaterQualityData } from './WaterQualityData';
import { GovernanceProject } from './GovernanceProject';
import { ProjectProgressReport } from './ProjectProgressReport';
import { ComplaintOrder } from './ComplaintOrder';
import { EcologicalAssessment } from './EcologicalAssessment';
import { Alert } from './Alert';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { ApprovalHistory } from './ApprovalHistory';
import { AnnualTask } from './AnnualTask';
import { FundDisbursement } from './FundDisbursement';
import { RealtimeStat } from './RealtimeStat';
import { WeeklyDiagnosisReport } from './WeeklyDiagnosisReport';
import { SystemConfig } from './SystemConfig';
import { OperationLog } from './OperationLog';
import { MessagePushLog } from './MessagePushLog';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres' as Dialect,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'water_governance',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  models: [
    Region,
    User,
    WaterBody,
    SewageOutlet,
    WaterQualityData,
    GovernanceProject,
    ProjectProgressReport,
    ComplaintOrder,
    EcologicalAssessment,
    Alert,
    ApprovalWorkflow,
    ApprovalHistory,
    AnnualTask,
    FundDisbursement,
    RealtimeStat,
    WeeklyDiagnosisReport,
    SystemConfig,
    OperationLog,
    MessagePushLog,
  ],
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  timezone: '+08:00',
  dialectOptions: {
    useUTC: false,
  },
} as any);

Region.hasMany(Region, { foreignKey: 'parentId', as: 'children' });
Region.belongsTo(Region, { foreignKey: 'parentId', as: 'parent' });

Region.hasMany(User, { foreignKey: 'regionId', as: 'users' });
User.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

User.hasMany(User, { foreignKey: 'createdBy', as: 'createdUsers' });
User.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Region.hasMany(WaterBody, { foreignKey: 'regionId', as: 'waterBodies' });
WaterBody.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

WaterBody.hasMany(SewageOutlet, { foreignKey: 'waterBodyId', as: 'sewageOutlets' });
SewageOutlet.belongsTo(WaterBody, { foreignKey: 'waterBodyId', as: 'waterBody' });

SewageOutlet.hasMany(WaterQualityData, { foreignKey: 'outletId', as: 'waterQualityData' });
WaterQualityData.belongsTo(SewageOutlet, { foreignKey: 'outletId', as: 'sewageOutlet' });

WaterBody.hasMany(GovernanceProject, { foreignKey: 'waterBodyId', as: 'governanceProjects' });
GovernanceProject.belongsTo(WaterBody, { foreignKey: 'waterBodyId', as: 'waterBody' });

GovernanceProject.hasMany(ProjectProgressReport, { foreignKey: 'projectId', as: 'progressReports' });
ProjectProgressReport.belongsTo(GovernanceProject, { foreignKey: 'projectId', as: 'project' });

User.hasMany(ProjectProgressReport, { foreignKey: 'submittedBy', as: 'submittedReports' });
ProjectProgressReport.belongsTo(User, { foreignKey: 'submittedBy', as: 'submitter' });

User.hasMany(ProjectProgressReport, { foreignKey: 'reviewedBy', as: 'reviewedReports' });
ProjectProgressReport.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

WaterBody.hasMany(ComplaintOrder, { foreignKey: 'waterBodyId', as: 'complaints' });
ComplaintOrder.belongsTo(WaterBody, { foreignKey: 'waterBodyId', as: 'waterBody' });

Region.hasMany(ComplaintOrder, { foreignKey: 'regionId', as: 'complaints' });
ComplaintOrder.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

WaterBody.hasMany(EcologicalAssessment, { foreignKey: 'waterBodyId', as: 'assessments' });
EcologicalAssessment.belongsTo(WaterBody, { foreignKey: 'waterBodyId', as: 'waterBody' });

User.hasMany(EcologicalAssessment, { foreignKey: 'assessorId', as: 'assessments' });
EcologicalAssessment.belongsTo(User, { foreignKey: 'assessorId', as: 'assessor' });

User.hasMany(EcologicalAssessment, { foreignKey: 'approvedBy', as: 'approvedAssessments' });
EcologicalAssessment.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

Region.hasMany(Alert, { foreignKey: 'regionId', as: 'alerts' });
Alert.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

Alert.hasOne(ApprovalWorkflow, { foreignKey: 'relatedAlertId', as: 'approvalWorkflow' });
ApprovalWorkflow.belongsTo(Alert, { foreignKey: 'relatedAlertId', as: 'alert' });

GovernanceProject.hasMany(ApprovalWorkflow, { foreignKey: 'projectId', as: 'approvalWorkflows' });
ApprovalWorkflow.belongsTo(GovernanceProject, { foreignKey: 'projectId', as: 'project' });

WaterBody.hasMany(ApprovalWorkflow, { foreignKey: 'waterBodyId', as: 'approvalWorkflows' });
ApprovalWorkflow.belongsTo(WaterBody, { foreignKey: 'waterBodyId', as: 'waterBody' });

Region.hasMany(ApprovalWorkflow, { foreignKey: 'regionId', as: 'approvalWorkflows' });
ApprovalWorkflow.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

User.hasMany(ApprovalWorkflow, { foreignKey: 'applicantId', as: 'appliedWorkflows' });
ApprovalWorkflow.belongsTo(User, { foreignKey: 'applicantId', as: 'applicant' });

User.hasMany(ApprovalWorkflow, { foreignKey: 'stage1Handler', as: 'stage1Workflows' });
ApprovalWorkflow.belongsTo(User, { foreignKey: 'stage1Handler', as: 'stage1HandlerUser' });

User.hasMany(ApprovalWorkflow, { foreignKey: 'stage2Handler', as: 'stage2Workflows' });
ApprovalWorkflow.belongsTo(User, { foreignKey: 'stage2Handler', as: 'stage2HandlerUser' });

User.hasMany(ApprovalWorkflow, { foreignKey: 'stage3Handler', as: 'stage3Workflows' });
ApprovalWorkflow.belongsTo(User, { foreignKey: 'stage3Handler', as: 'stage3HandlerUser' });

ApprovalWorkflow.hasMany(ApprovalHistory, { foreignKey: 'workflowId', as: 'history' });
ApprovalHistory.belongsTo(ApprovalWorkflow, { foreignKey: 'workflowId', as: 'workflow' });

User.hasMany(ApprovalHistory, { foreignKey: 'operatorId', as: 'approvalOperations' });
ApprovalHistory.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

Region.hasMany(AnnualTask, { foreignKey: 'regionId', as: 'annualTasks' });
AnnualTask.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

WaterBody.hasMany(AnnualTask, { foreignKey: 'waterBodyId', as: 'annualTasks' });
AnnualTask.belongsTo(WaterBody, { foreignKey: 'waterBodyId', as: 'waterBody' });

User.hasMany(AnnualTask, { foreignKey: 'uploadUserId', as: 'uploadedTasks' });
AnnualTask.belongsTo(User, { foreignKey: 'uploadUserId', as: 'uploader' });

AnnualTask.hasMany(FundDisbursement, { foreignKey: 'taskId', as: 'fundDisbursements' });
FundDisbursement.belongsTo(AnnualTask, { foreignKey: 'taskId', as: 'annualTask' });

GovernanceProject.hasMany(FundDisbursement, { foreignKey: 'projectId', as: 'fundDisbursements' });
FundDisbursement.belongsTo(GovernanceProject, { foreignKey: 'projectId', as: 'project' });

User.hasMany(FundDisbursement, { foreignKey: 'operatorId', as: 'operatedFunds' });
FundDisbursement.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

Region.hasMany(RealtimeStat, { foreignKey: 'regionId', as: 'realtimeStats' });
RealtimeStat.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

WaterBody.hasMany(RealtimeStat, { foreignKey: 'waterBodyId', as: 'realtimeStats' });
RealtimeStat.belongsTo(WaterBody, { foreignKey: 'waterBodyId', as: 'waterBody' });

SewageOutlet.hasMany(RealtimeStat, { foreignKey: 'outletId', as: 'realtimeStats' });
RealtimeStat.belongsTo(SewageOutlet, { foreignKey: 'outletId', as: 'sewageOutlet' });

GovernanceProject.hasMany(RealtimeStat, { foreignKey: 'projectId', as: 'realtimeStats' });
RealtimeStat.belongsTo(GovernanceProject, { foreignKey: 'projectId', as: 'project' });

Region.hasMany(WeeklyDiagnosisReport, { foreignKey: 'regionId', as: 'weeklyReports' });
WeeklyDiagnosisReport.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

User.hasMany(WeeklyDiagnosisReport, { foreignKey: 'generatedBy', as: 'generatedReports' });
WeeklyDiagnosisReport.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });

User.hasMany(SystemConfig, { foreignKey: 'updatedBy', as: 'updatedConfigs' });
SystemConfig.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

User.hasMany(OperationLog, { foreignKey: 'userId', as: 'operationLogs' });
OperationLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  sequelize,
  Region,
  User,
  WaterBody,
  SewageOutlet,
  WaterQualityData,
  GovernanceProject,
  ProjectProgressReport,
  ComplaintOrder,
  EcologicalAssessment,
  Alert,
  ApprovalWorkflow,
  ApprovalHistory,
  AnnualTask,
  FundDisbursement,
  RealtimeStat,
  WeeklyDiagnosisReport,
  SystemConfig,
  OperationLog,
  MessagePushLog,
};

export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      console.log('Database models synchronized successfully.');
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export default sequelize;
