export enum RegionLevel {
  NATIONAL = 1,
  PROVINCIAL = 2,
  MUNICIPAL = 3,
}

export enum UserLevel {
  NATIONAL = 1,
  PROVINCIAL = 2,
  MUNICIPAL = 3,
}

export enum UserRole {
  ADMIN = 'admin',
  APPROVER = 'approver',
  AUDITOR = 'auditor',
  VIEWER = 'viewer',
}

export enum WaterBodyType {
  RIVER = 1,
  LAKE = 2,
  POND = 3,
  OTHER = 4,
}

export enum WaterBodyLevel {
  BLACK_ODOROUS = 1,
  MILD_BLACK_ODOROUS = 2,
  SEVERE_BLACK_ODOROUS = 3,
  ELIMINATED = 4,
}

export enum GovernanceStage {
  PLAN_FORMULATION = 1,
  CONSTRUCTION = 2,
  EFFECT_EVALUATION = 3,
  LONG_TERM_MANAGEMENT = 4,
}

export enum WaterBodyStatus {
  UNDER_GOVERNANCE = 1,
  COMPLETED = 2,
  REBOUND = 3,
  CLOSED = 4,
}

export enum OutletType {
  INDUSTRIAL = 1,
  DOMESTIC = 2,
  MIXED = 3,
  AGRICULTURAL = 4,
}

export enum DischargeMethod {
  DIRECT = 1,
  OVERFLOW = 2,
  UNDERGROUND = 3,
}

export enum DataQuality {
  VALID = 1,
  INVALID = 2,
  REVISED = 3,
  COMPLETED = 4,
}

export enum ProjectType {
  SEWAGE_INTERCEPTION = 1,
  DREDGING = 2,
  ECOLOGICAL_RESTORATION = 3,
  WATER_CIRCULATION = 4,
  NON_POINT_SOURCE_TREATMENT = 5,
  OTHER = 6,
}

export enum ProjectStatus {
  NOT_STARTED = 1,
  UNDER_CONSTRUCTION = 2,
  COMPLETED = 3,
  ACCEPTED = 4,
  DELAYED = 5,
}

export enum QualityStatus {
  EXCELLENT = 1,
  QUALIFIED = 2,
  UNQUALIFIED = 3,
}

export enum ReportStatus {
  DRAFT = 1,
  SUBMITTED = 2,
  REVIEWED = 3,
}

export enum ComplaintSource {
  PHONE = 1,
  WECHAT = 2,
  WEBSITE = 3,
  APP = 4,
  LETTER = 5,
  ON_SITE = 6,
}

export enum ComplaintType {
  BLACK_ODOROUS = 1,
  SEWAGE_DISCHARGE = 2,
  FLOATING_GARBAGE = 3,
  VEGETATION_DAMAGE = 4,
  FACILITY_DAMAGE = 5,
  OTHER = 6,
}

export enum Priority {
  URGENT = 1,
  NORMAL = 2,
  LOW = 3,
}

export enum OrderStatus {
  PENDING_ACCEPTANCE = 1,
  PROCESSING = 2,
  PROCESSED = 3,
  FOLLOWED_UP = 4,
  CLOSED = 5,
}

export enum AssessmentType {
  QUARTERLY = 1,
  ANNUAL = 2,
  FINAL_ACCEPTANCE = 3,
  SPECIAL = 4,
}

export enum AssessmentLevel {
  EXCELLENT = '优秀',
  GOOD = '良好',
  QUALIFIED = '合格',
  UNQUALIFIED = '不合格',
}

export enum AlertType {
  WATER_QUALITY_OVERPROOF = 1,
  PROGRESS_DELAY = 2,
  FUND_ABNORMAL = 3,
  COMPLAINT_CONCENTRATION = 4,
}

export enum AlertLevel {
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
}

export enum SourceType {
  SEWAGE_OUTLET = 1,
  WATER_BODY = 2,
  PROJECT = 3,
  REGION = 4,
}

export enum AlertStatus {
  PENDING = 1,
  PROCESSING = 2,
  PROCESSED = 3,
  RESOLVED = 4,
  IGNORED = 5,
}

export enum PushStatus {
  NOT_PUSHED = 0,
  PUSHING = 1,
  PUSHED = 2,
  PUSH_FAILED = 3,
}

export enum WorkflowType {
  GOVERNANCE_PLAN_ADJUSTMENT = 1,
  EMERGENCY_SEWAGE_INTERCEPTION = 2,
  PROJECT_DELAY = 3,
  FUND_ADJUSTMENT = 4,
}

export enum WorkflowStage {
  STAGE_1_PENDING = 1,
  STAGE_2_PENDING = 2,
  STAGE_3_PENDING = 3,
  COMPLETED = 4,
  REJECTED = 5,
}

export enum WorkflowStatus {
  IN_PROGRESS = 1,
  APPROVED = 2,
  REJECTED = 3,
  CANCELLED = 4,
}

export enum ApprovalResult {
  APPROVED = 1,
  REJECTED = 2,
}

export enum OperationType {
  SUBMIT = 1,
  APPROVE = 2,
  REJECT = 3,
  CORRECT = 4,
  CANCEL = 5,
}

export enum TaskType {
  WATER_BODY_ELIMINATION = 1,
  PROJECT_CONSTRUCTION = 2,
  WATER_QUALITY_IMPROVEMENT = 3,
  ECOLOGICAL_RESTORATION = 4,
}

export enum TaskStatus {
  NOT_STARTED = 1,
  IN_PROGRESS = 2,
  COMPLETED = 3,
  DELAYED = 4,
}

export enum FundMatchStatus {
  MATCHED = 1,
  BASICALLY_MATCHED = 2,
  UNMATCHED = 3,
}

export enum FundType {
  CENTRAL_FINANCE = 1,
  PROVINCIAL_FINANCE = 2,
  MUNICIPAL_FINANCE = 3,
  SELF_FINANCING = 4,
  OTHER = 5,
}

export enum PaymentStatus {
  PENDING = 1,
  PAID = 2,
  REFUNDED = 3,
}

export enum StatType {
  REGION = 1,
  WATER_BODY = 2,
  SEWAGE_OUTLET = 3,
  PROJECT = 4,
}

export enum StatPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum ConfigType {
  STRING = 'string',
  INTEGER = 'integer',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

export enum MessageType {
  ALERT = 1,
  APPROVAL = 2,
  NOTIFICATION = 3,
  REPORT = 4,
}

export enum ReceiverType {
  USER = 1,
  DEPARTMENT = 2,
  ROLE = 3,
}

export enum PushChannel {
  SMS = 'sms',
  APP = 'app',
  EMAIL = 'email',
  WECHAT = 'wechat',
}
