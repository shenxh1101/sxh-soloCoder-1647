import { WaterBody, WaterQualityData, ComplaintOrder, GovernanceProject, ProjectProgressReport, Region, SewageOutlet, User } from '../models';
import {
  ComplaintSource,
  ComplaintType,
  Priority,
  OrderStatus,
  ProjectStatus,
  QualityStatus,
  ReportStatus,
  UserLevel,
  UserRole,
  WaterBodyType,
  WaterBodyLevel,
  GovernanceStage,
  WaterBodyStatus,
  OutletType,
  DischargeMethod,
  DataQuality,
  ProjectType,
} from '../models/enums';

const random = (min: number, max: number): number => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number): number => Math.floor(random(min, max + 1));
const randomItem = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];
const randomDate = (start: Date, end: Date): Date => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomDateInDays = (days: number): Date => randomDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000), new Date());

export interface WaterQualityMockOptions {
  outletId?: number;
  count?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ComplaintMockOptions {
  regionId?: number;
  waterBodyId?: number;
  count?: number;
}

export interface ProjectProgressMockOptions {
  projectId?: number;
  count?: number;
  startDate?: Date;
}

export const generateWaterQualityData = async (options: WaterQualityMockOptions = {}): Promise<WaterQualityData[]> => {
  const {
    outletId,
    count = 100,
    startDate = randomDateInDays(365),
    endDate = new Date(),
  } = options;

  let outletIds: number[] = [];
  if (outletId) {
    outletIds = [outletId];
  } else {
    const outlets = await SewageOutlet.findAll({ attributes: ['outletId'], limit: 20 });
    outletIds = outlets.map(o => o.outletId);
    if (outletIds.length === 0) {
      outletIds = [1, 2, 3, 4, 5];
    }
  }

  const dataList: WaterQualityData[] = [];

  for (let i = 0; i < count; i++) {
    const monitorTime = randomDate(startDate, endDate);
    const phValue = random(6.0, 9.5);
    const dissolvedOxygen = random(3.0, 10.0);
    const cod = random(10, 60);
    const ammoniaNitrogen = random(0.2, 5.0);
    const totalPhosphorus = random(0.1, 2.0);
    const totalNitrogen = random(1.0, 15.0);

    const isNh3nOverproof = ammoniaNitrogen > 2.0;
    const isTpOverproof = totalPhosphorus > 0.4;
    const isCompliant = phValue >= 6.5 && phValue <= 8.5 && dissolvedOxygen >= 5 && cod <= 40 && ammoniaNitrogen <= 2.0 && totalPhosphorus <= 0.4 && totalNitrogen <= 3.0;

    const data = WaterQualityData.build({
      outletId: randomItem(outletIds),
      monitorTime,
      waterTemperature: parseFloat(random(10, 35).toFixed(1)),
      phValue: parseFloat(phValue.toFixed(2)),
      dissolvedOxygen: parseFloat(dissolvedOxygen.toFixed(2)),
      ammoniaNitrogen: parseFloat(ammoniaNitrogen.toFixed(2)),
      totalPhosphorus: parseFloat(totalPhosphorus.toFixed(2)),
      totalNitrogen: parseFloat(totalNitrogen.toFixed(2)),
      cod: parseFloat(cod.toFixed(2)),
      bod5: parseFloat(random(2, 30).toFixed(2)),
      transparency: parseFloat(random(20, 150).toFixed(0)),
      oxidationReductionPotential: parseFloat(random(100, 500).toFixed(0)),
      conductivity: parseFloat(random(200, 800).toFixed(0)),
      turbidity: parseFloat(random(10, 100).toFixed(1)),
      flowRate: parseFloat(random(0.1, 5.0).toFixed(2)),
      isNh3nOverproof,
      isTpOverproof,
      isCompliant,
      dataQuality: randomItem([DataQuality.VALID, DataQuality.VALID, DataQuality.VALID, DataQuality.REVISED]),
      rawData: isCompliant ? undefined : { note: '部分指标超标' },
    });

    dataList.push(data);
  }

  return WaterQualityData.bulkCreate(dataList);
};

export const generateComplaintData = async (options: ComplaintMockOptions = {}): Promise<ComplaintOrder[]> => {
  const { regionId, waterBodyId, count = 50 } = options;

  let regionIds: number[] = regionId ? [regionId] : [];
  let waterBodyIds: number[] = waterBodyId ? [waterBodyId] : [];
  let userIds: number[] = [];

  if (!regionId) {
    const regions = await Region.findAll({ attributes: ['regionId'], limit: 10 });
    regionIds = regions.map(r => r.regionId);
    if (regionIds.length === 0) regionIds = [1, 2, 3];
  }

  if (!waterBodyId) {
    const waterBodies = await WaterBody.findAll({ attributes: ['waterBodyId'], limit: 15 });
    waterBodyIds = waterBodies.map(wb => wb.waterBodyId);
    if (waterBodyIds.length === 0) waterBodyIds = [1, 2, 3, 4];
  }

  const users = await User.findAll({ attributes: ['userId'], limit: 10 });
  userIds = users.map(u => u.userId);
  if (userIds.length === 0) userIds = [1, 2, 3];

  const complaintContents = [
    '周边居民反映该河段近期水体发黑，散发恶臭，严重影响生活环境。',
    '发现有管道正在向河道排放未经处理的污水，水面有明显油污。',
    '河面上漂浮着大量塑料垃圾和生活垃圾，已有数日未清理。',
    '岸边绿化带被人为破坏，树木被砍伐，土壤裸露。',
    '排污口闸门损坏，无法正常关闭，导致污水持续排放。',
    '水体呈现异常的红褐色，疑似有工业废水排入。',
    '河面发现大量死鱼，疑为水质污染所致。',
    '周边气味难闻，窗户都不敢开，严重影响正常生活。',
    '有人在夜间向河边倾倒建筑垃圾和生活垃圾。',
    '发现隐蔽的排污管道，疑似企业偷排废水。',
  ];

  const locationDescriptions = [
    '东河桥下500米处',
    '南湖公园西侧岸边',
    '工业园区北侧河道',
    '居民区东侧排污口',
    '老城区护城河段',
    '旅游景区亲水平台',
    '新建大桥下游',
    '污水处理厂出水口附近',
  ];

  const processResults = [
    '已现场核实情况，安排清理队伍进行处理。',
    '已联系相关责任单位，责令限期整改。',
    '已完成污水截流，水质正在恢复。',
    '已清理水面垃圾，加强日常巡查。',
    '已对涉事企业进行立案查处。',
  ];

  const dataList: ComplaintOrder[] = [];

  for (let i = 0; i < count; i++) {
    const orderStatus = randomItem([
      OrderStatus.PENDING_ACCEPTANCE,
      OrderStatus.PROCESSING,
      OrderStatus.PROCESSING,
      OrderStatus.PROCESSED,
      OrderStatus.FOLLOWED_UP,
      OrderStatus.CLOSED,
    ]);

    const complaintTime = randomDateInDays(180);
    const longitude = parseFloat(random(116.0, 117.0).toFixed(6));
    const latitude = parseFloat(random(39.0, 40.0).toFixed(6));

    let acceptTime: Date | undefined = undefined;
    let processStartTime: Date | undefined = undefined;
    let processEndTime: Date | undefined = undefined;
    let reviewTime: Date | undefined = undefined;

    if (orderStatus >= OrderStatus.PROCESSING) {
      acceptTime = new Date(complaintTime.getTime() + randomInt(1, 24) * 60 * 60 * 1000);
    }
    if (orderStatus >= OrderStatus.PROCESSED) {
      processStartTime = new Date(acceptTime!.getTime() + randomInt(1, 24) * 60 * 60 * 1000);
      processEndTime = new Date(processStartTime!.getTime() + randomInt(1, 72) * 60 * 60 * 1000);
    }
    if (orderStatus >= OrderStatus.FOLLOWED_UP) {
      reviewTime = new Date(processEndTime!.getTime() + randomInt(1, 48) * 60 * 60 * 1000);
    }

    const handlerPerson = orderStatus >= OrderStatus.PROCESSING ? `工作人员${randomInt(1, 20)}` : undefined;

    const data = ComplaintOrder.build({
      complaintCode: `TS${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
      waterBodyId: randomItem(waterBodyIds),
      regionId: randomItem(regionIds),
      source: randomItem([ComplaintSource.PHONE, ComplaintSource.WECHAT, ComplaintSource.WEBSITE, ComplaintSource.APP]),
      complaintType: randomItem([ComplaintType.BLACK_ODOROUS, ComplaintType.SEWAGE_DISCHARGE, ComplaintType.FLOATING_GARBAGE]),
      complaintContent: randomItem(complaintContents),
      complaintTime,
      complainantName: `市民${randomInt(1000, 9999)}`,
      complainantPhone: `138${String(randomInt(10000000, 99999999))}`,
      complainantAddress: undefined,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      locationDescription: randomItem(locationDescriptions),
      attachments: undefined,
      priority: randomItem([Priority.URGENT, Priority.NORMAL, Priority.NORMAL, Priority.LOW]),
      orderStatus,
      satisfactionScore: orderStatus === OrderStatus.CLOSED ? randomInt(3, 5) : undefined,
      satisfactionFeedback: orderStatus === OrderStatus.CLOSED ? '处理及时，结果满意' : undefined,
      hotKeywords: undefined,
      handlerUnit: orderStatus >= OrderStatus.PROCESSING ? '水环境治理办公室' : undefined,
      handlerPerson,
      deadline: orderStatus >= OrderStatus.PROCESSING ? new Date(complaintTime.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined,
      acceptTime,
      processStartTime,
      processEndTime,
      processResult: orderStatus >= OrderStatus.PROCESSED ? randomItem(processResults) : undefined,
      reviewTime,
    });

    dataList.push(data);
  }

  return ComplaintOrder.bulkCreate(dataList);
};

export const generateProjectProgressData = async (options: ProjectProgressMockOptions = {}): Promise<ProjectProgressReport[]> => {
  const { projectId, count = 30, startDate = randomDateInDays(365) } = options;

  let projectIds: number[] = projectId ? [projectId] : [];
  let userIds: number[] = [];

  if (!projectId) {
    const projects = await GovernanceProject.findAll({ attributes: ['projectId'], limit: 10 });
    projectIds = projects.map(p => p.projectId);
    if (projectIds.length === 0) projectIds = [1, 2, 3, 4, 5];
  }

  const users = await User.findAll({ attributes: ['userId'], limit: 10 });
  userIds = users.map(u => u.userId);
  if (userIds.length === 0) userIds = [1, 2, 3];

  const monthlyActualContents = [
    '完成污水管道铺设1.5公里，检查井20座。',
    '完成河道清淤2万立方米，清运垃圾500吨。',
    '完成生态护坡修复300米，种植水生植物5000平方米。',
    '完成曝气设备安装10套，在线监测设备5套。',
    '完成截污井改造8座，修复破损管道200米。',
    '完成沿岸绿化提升2公里，补种树木300棵。',
  ];

  const nextMonthPlans = [
    '继续推进剩余管道铺设工作，计划完成1公里。',
    '开展水质监测，评估治理效果，调整优化方案。',
    '完善配套设施建设，安装警示标识牌。',
    '组织竣工验收准备工作，整理工程资料。',
    '加强日常巡查维护，确保设施正常运行。',
  ];

  const existingProblemsOptions = [
    '受近期降雨天气影响，施工进度略有滞后。',
    '部分征地协调工作尚未完成，影响施工范围。',
    '资金拨付流程较慢，建议加快审批进度。',
    '材料供应紧张，需要提前备货。',
  ];

  const dataList: ProjectProgressReport[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const reportDate = new Date(currentDate);
    reportDate.setDate(reportDate.getDate() + i * 30);

    if (reportDate > new Date()) break;

    const monthlyPlannedProgress = random(15, 25);
    const monthlyActualProgress = parseFloat(random(monthlyPlannedProgress * 0.8, monthlyPlannedProgress * 1.1).toFixed(1));
    const cumulativePlannedProgress = Math.min(100, (i + 1) * monthlyPlannedProgress);
    const cumulativeActualProgress = Math.min(100, parseFloat((cumulativePlannedProgress * random(0.85, 1.05)).toFixed(1)));

    const reportStatus = reportDate > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      ? randomItem([ReportStatus.DRAFT, ReportStatus.SUBMITTED, ReportStatus.REVIEWED])
      : ReportStatus.REVIEWED;

    const data = ProjectProgressReport.build({
      projectId: randomItem(projectIds),
      reportPeriod: `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`,
      reportDate,
      monthlyPlanContent: `本月计划完成工程进度${monthlyPlannedProgress}%，主要进行管道铺设和设备安装。`,
      monthlyActualContent: randomItem(monthlyActualContents),
      monthlyPlannedProgress: parseFloat(monthlyPlannedProgress.toFixed(1)),
      monthlyActualProgress,
      cumulativePlannedProgress: parseFloat(cumulativePlannedProgress.toFixed(1)),
      cumulativeActualProgress,
      monthlyInvestmentPlan: parseFloat(random(100, 500).toFixed(2)),
      monthlyActualInvestment: parseFloat(random(80, 450).toFixed(2)),
      cumulativeInvestment: parseFloat(random(500, 3000).toFixed(2)),
      constructionPersonnel: randomInt(20, 80),
      equipmentCount: randomInt(5, 20),
      existingProblems: randomInt(1, 10) > 7 ? randomItem(existingProblemsOptions) : undefined,
      nextMonthPlan: randomItem(nextMonthPlans),
      supportNeeded: undefined,
      attachments: undefined,
      reportStatus,
      submittedBy: reportStatus >= ReportStatus.SUBMITTED ? randomItem(userIds) : undefined,
      submittedAt: reportStatus >= ReportStatus.SUBMITTED ? new Date(reportDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000) : undefined,
      reviewedBy: reportStatus === ReportStatus.REVIEWED ? randomItem(userIds) : undefined,
      reviewedAt: reportStatus === ReportStatus.REVIEWED ? new Date(reportDate.getTime() + randomInt(5, 10) * 24 * 60 * 60 * 1000) : undefined,
    });

    dataList.push(data);
  }

  return ProjectProgressReport.bulkCreate(dataList);
};

export const generateAllMockData = async (): Promise<{ waterQuality: number; complaints: number; progressReports: number }> => {
  console.log('开始生成模拟数据...');

  const [waterQuality, complaints, progressReports] = await Promise.all([
    generateWaterQualityData({ count: 200 }),
    generateComplaintData({ count: 80 }),
    generateProjectProgressData({ count: 50 }),
  ]);

  console.log(`模拟数据生成完成：`);
  console.log(`  - 水质监测数据: ${waterQuality.length} 条`);
  console.log(`  - 投诉工单数据: ${complaints.length} 条`);
  console.log(`  - 项目进度数据: ${progressReports.length} 条`);

  return {
    waterQuality: waterQuality.length,
    complaints: complaints.length,
    progressReports: progressReports.length,
  };
};

export const clearMockData = async (): Promise<void> => {
  console.log('开始清理模拟数据...');

  await WaterQualityData.destroy({ where: {} });
  await ComplaintOrder.destroy({ where: {} });
  await ProjectProgressReport.destroy({ where: {} });

  console.log('模拟数据清理完成');
};

if (require.main === module) {
  generateAllMockData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('生成模拟数据失败:', err);
      process.exit(1);
    });
}
