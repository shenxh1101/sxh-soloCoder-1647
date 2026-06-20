export interface ApiResult<T = any> {
  code: number
  data: T
  message: string
}

export interface PageParams {
  pageNum: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
  phone: string
  status: number
  role: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface LoginParams {
  username: string
  password: string
  remember?: boolean
}

export interface LoginResult {
  token: string
  refreshToken: string
  expiresIn: number
  userInfo: UserInfo
}

export interface ChangePasswordParams {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UserListParams extends PageParams {
  username?: string
  nickname?: string
  status?: number
  role?: string
}

export interface UserFormData {
  id?: number
  username: string
  nickname: string
  email: string
  phone: string
  role: string
  status: number
  password?: string
  confirmPassword?: string
}

export interface RegionStats {
  province: string
  provinceCode: string
  waterBodyCount: number
  qualifiedCount: number
  qualifiedRate: number
  completionRate: number
  satisfaction: number
  treatmentCount: number
}

export interface WaterBodyStats {
  total: number
  level1: number
  level2: number
  level3: number
  level4: number
  level5: number
  underLevel5: number
  qualifiedRate: number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

export interface RealtimeStats {
  time: string
  ph: number
  dissolvedOxygen: number
  cod: number
  ammoniaNitrogen: number
  temperature: number
  turbidity: number
}

export interface TrendDataPoint {
  date: string
  qualifiedRate: number
  completionRate: number
  satisfaction: number
  abnormalIndex: number
}

export interface TrendData {
  days: TrendDataPoint[]
  comparison: {
    yearOnYear: number
    monthOnMonth: number
  }
}

export interface StatsFilterParams {
  province?: string
  waterLevel?: string
  startDate?: string
  endDate?: string
}

export interface WaterBody {
  id: number
  name: string
  code: string
  type: 'river' | 'lake' | 'reservoir' | 'ocean'
  level: 1 | 2 | 3 | 4 | 5
  province: string
  city: string
  area: number
  length?: number
  currentQuality: string
  targetQuality: string
  status: 'normal' | 'warning' | 'treatment'
  longitude: number
  latitude: number
  description: string
  createdAt: string
  updatedAt: string
}

export interface WaterBodyDetail extends WaterBody {
  indicators: {
    ph: number
    dissolvedOxygen: number
    cod: number
    ammoniaNitrogen: number
    totalPhosphorus: number
    totalNitrogen: number
    permanganate: number
  }
  processList: WaterQualityProcess[]
  complaintHotwords: HotwordItem[]
  relatedProjects: Project[]
  relatedOutlets: OutletInfo[]
}

export interface WaterQualityProcess {
  name: string
  proportion: number
  count: number
}

export interface HotwordItem {
  word: string
  count: number
}

export interface OutletInfo {
  id: number
  name: string
  code: string
  status: 'normal' | 'abnormal'
  discharge: number
  lastCheckTime: string
}

export interface WaterBodyTrendPoint {
  date: string
  ph: number
  dissolvedOxygen: number
  cod: number
  ammoniaNitrogen: number
}

export interface WaterBodyListParams extends PageParams {
  name?: string
  type?: string
  level?: number
  province?: string
  status?: string
}

export interface Alert {
  id: number
  code: string
  title: string
  level: 'low' | 'medium' | 'high' | 'critical'
  type: 'water_quality' | 'outlet' | 'project' | 'complaint'
  waterBodyId: number
  waterBodyName: string
  description: string
  indicator?: string
  threshold?: number
  currentValue?: number
  status: 'pending' | 'processing' | 'resolved' | 'closed'
  handlerId?: number
  handlerName?: string
  handleTime?: string
  handleResult?: string
  createdAt: string
  updatedAt: string
}

export interface AlertDetail extends Alert {
  history: AlertHistory[]
}

export interface AlertHistory {
  id: number
  operator: string
  action: string
  remark: string
  time: string
}

export interface AlertListParams extends PageParams {
  level?: string
  type?: string
  status?: string
  keyword?: string
  startDate?: string
  endDate?: string
}

export interface AlertHandleParams {
  id: number
  action: 'process' | 'resolve' | 'close'
  handleResult: string
  handlerName: string
}

export interface AlertStats {
  total: number
  pending: number
  processing: number
  resolved: number
  closed: number
  critical: number
  high: number
  medium: number
  low: number
  todayCount: number
}

export interface Approval {
  id: number
  code: string
  title: string
  type: 'project' | 'fund' | 'plan' | 'other'
  applicantId: number
  applicantName: string
  applicantDept: string
  status: 'pending' | 'approved' | 'rejected' | 'processing'
  currentStep: number
  totalSteps: number
  currentApprover?: string
  createdAt: string
  updatedAt: string
}

export interface ApprovalDetail extends Approval {
  content: string
  attachments: ApprovalAttachment[]
  flow: ApprovalFlowStep[]
  formData: Record<string, any>
}

export interface ApprovalAttachment {
  id: number
  name: string
  url: string
  size: number
}

export interface ApprovalFlowStep {
  step: number
  name: string
  approver?: string
  status: 'pending' | 'approved' | 'rejected' | 'current'
  opinion?: string
  time?: string
}

export interface ApprovalListParams extends PageParams {
  type?: string
  status?: string
  keyword?: string
  tab?: 'pending' | 'initiated' | 'all'
}

export interface ApprovalSubmitParams {
  type: string
  title: string
  content: string
  formData: Record<string, any>
  attachments?: number[]
}

export interface ApprovalHandleParams {
  id: number
  opinion: string
  pass: boolean
}

export interface Project {
  id: number
  code: string
  name: string
  type: 'governance' | 'monitoring' | 'infrastructure' | 'research'
  waterBodyId?: number
  waterBodyName?: string
  province: string
  city: string
  budget: number
  actualCost?: number
  progress: number
  status: 'pending' | 'processing' | 'suspended' | 'completed' | 'accepted'
  startDate: string
  endDate: string
  actualEndDate?: string
  managerId: number
  managerName: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends Project {
  milestones: ProjectMilestone[]
  progressHistory: ProgressRecord[]
  relatedWaterBodies: WaterBody[]
}

export interface ProjectMilestone {
  id: number
  name: string
  targetDate: string
  actualDate?: string
  status: 'pending' | 'completed' | 'delayed'
}

export interface ProgressRecord {
  date: string
  progress: number
  cost: number
}

export interface ProjectListParams extends PageParams {
  name?: string
  type?: string
  status?: string
  province?: string
  managerName?: string
}

export interface ProgressSubmitParams {
  projectId: number
  progress: number
  cost: number
  remark: string
  date: string
}

export interface Complaint {
  id: number
  code: string
  title: string
  type: 'water_quality' | 'pollution' | 'facility' | 'other'
  waterBodyId?: number
  waterBodyName?: string
  province: string
  city: string
  location: string
  longitude: number
  latitude: number
  description: string
  images?: string[]
  reporterName: string
  reporterPhone: string
  anonymous: boolean
  status: 'pending' | 'processing' | 'resolved' | 'closed'
  handlerId?: number
  handlerName?: string
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

export interface ComplaintDetail extends Complaint {
  handleHistory: ComplaintHandleRecord[]
}

export interface ComplaintHandleRecord {
  id: number
  operator: string
  action: string
  remark: string
  time: string
  images?: string[]
}

export interface ComplaintListParams extends PageParams {
  type?: string
  status?: string
  priority?: string
  province?: string
  keyword?: string
  startDate?: string
  endDate?: string
}

export interface ComplaintHandleParams {
  id: number
  action: 'process' | 'resolve' | 'close'
  remark: string
  handlerName: string
  images?: string[]
}

export interface ComplaintStats {
  total: number
  pending: number
  processing: number
  resolved: number
  todayCount: number
  typeDistribution: { name: string; value: number }[]
  dailyTrend: { date: string; count: number }[]
  avgHandleTime: number
  satisfaction: number
}

export interface Task {
  id: number
  code: string
  name: string
  year: number
  type: 'governance' | 'monitoring' | 'protection' | 'research'
  province: string
  city: string
  targetAmount: number
  allocatedAmount: number
  paidAmount: number
  progress: number
  status: 'pending' | 'processing' | 'suspended' | 'completed' | 'cancelled'
  managerId: number
  managerName: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface TaskDetail extends Task {
  milestones: TaskMilestone[]
  fundHistory: FundDisbursement[]
  attachments: Attachment[]
}

export interface TaskMilestone {
  id: number
  name: string
  targetDate: string
  actualDate?: string
  status: 'pending' | 'completed' | 'delayed'
  description: string
}

export interface TaskListParams extends PageParams {
  year?: number
  province?: string
  status?: string
  keyword?: string
  type?: string
}

export interface TaskFormData {
  id?: number
  name: string
  year: number
  type: string
  province: string
  city: string
  targetAmount: number
  managerId: number
  managerName: string
  description: string
  status: string
}

export interface FundDisbursement {
  id: number
  taskId: number
  taskName: string
  amount: number
  type: 'budget' | 'allocation' | 'payment'
  payer: string
  payee: string
  date: string
  remark: string
  operator: string
  createdAt: string
}

export interface FundFormData {
  amount: number
  type: string
  payer: string
  payee: string
  date: string
  remark: string
  operator: string
}

export interface FundAbnormalResult {
  hasAbnormal: boolean
  abnormalItems: FundAbnormalItem[]
}

export interface FundAbnormalItem {
  type: 'over_budget' | 'no_record' | 'amount_mismatch' | 'date_abnormal'
  description: string
  severity: 'low' | 'medium' | 'high'
  relatedId?: number
}

export interface ImportResult {
  success: number
  failed: number
  total: number
  errors: ImportError[]
}

export interface ImportError {
  row: number
  message: string
}

export interface Report {
  id: number
  code: string
  name: string
  type: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  year: number
  week?: number
  month?: number
  quarter?: number
  province: string
  generateTime: string
  generator: string
  status: 'draft' | 'published' | 'archived'
  fileUrl?: string
  createdAt: string
}

export interface ReportDetail extends Report {
  content: ReportWeeklyData
}

export interface ReportWeeklyData {
  summary: string
  coreIndicators: CoreIndicator[]
  comparisonData: ComparisonData
  complaintDistribution: ChartData[]
  delayAnalysis: DelayAnalysisItem[]
  waterQualityTrend: TrendPoint[]
  projectProgress: ProjectProgressItem[]
  problems: string[]
  suggestions: string[]
}

export interface CoreIndicator {
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

export interface ComparisonData {
  yearOnYear: { name: string; value: number; rate: number }[]
  monthOnMonth: { name: string; value: number; rate: number }[]
}

export interface ChartData {
  name: string
  value: number
}

export interface DelayAnalysisItem {
  type: string
  count: number
  avgDays: number
  reasons: string[]
}

export interface TrendPoint {
  date: string
  value: number
}

export interface ProjectProgressItem {
  projectName: string
  plannedProgress: number
  actualProgress: number
  status: 'normal' | 'delayed' | 'ahead'
}

export interface ReportListParams extends PageParams {
  year?: number
  week?: number
  province?: string
  type?: string
  status?: string
  keyword?: string
}

export interface GenerateWeeklyParams {
  year: number
  week: number
  province: string
}

export interface SystemConfig {
  id: number
  key: string
  value: string
  name: string
  description: string
  group: 'alert' | 'water_quality' | 'approval' | 'report' | 'system'
  type: 'string' | 'number' | 'boolean' | 'json'
  options?: string
  sort: number
  updatedAt: string
  updatedBy: string
}

export interface ConfigListParams extends PageParams {
  group?: string
  keyword?: string
}

export interface ConfigUpdateParams {
  value: string
  remark?: string
}

export interface BatchUpdateParams {
  items: { key: string; value: string }[]
}

export interface JobInfo {
  id: string
  name: string
  description: string
  cron: string
  status: 'running' | 'stopped' | 'error'
  lastExecuteTime?: string
  nextExecuteTime?: string
  lastExecuteResult?: 'success' | 'failed'
  createTime: string
}

export interface JobControlParams {
  jobId: string
  action: 'start' | 'stop' | 'execute'
}

export interface Attachment {
  id: number
  name: string
  url: string
  size: number
  uploadTime: string
}
