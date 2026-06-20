import bcrypt from 'bcryptjs';
import {
  Region,
  User,
  WaterBody,
  SewageOutlet,
  WaterQualityData,
  GovernanceProject,
  ComplaintOrder,
  SystemConfig,
} from '../models';
import {
  RegionLevel,
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
  ProjectStatus,
  ComplaintSource,
  ComplaintType,
  Priority,
  OrderStatus,
  ConfigType,
} from '../models/enums';

export const seedRegions = async (): Promise<{ national: Region; provinces: Region[]; cities: Region[] }> => {
  console.log('Seeding regions...');

  const national = await Region.create({
    regionCode: '100000',
    regionName: '国家',
    regionLevel: RegionLevel.NATIONAL,
    parentId: undefined,
    sortOrder: 1,
    isActive: true,
  });

  const provinceData = [
    { code: '110000', name: '北京市', abbr: '京' },
    { code: '310000', name: '上海市', abbr: '沪' },
    { code: '440000', name: '广东省', abbr: '粤' },
  ];

  const provinces: Region[] = [];
  for (let i = 0; i < provinceData.length; i++) {
    const province = await Region.create({
      regionCode: provinceData[i].code,
      regionName: provinceData[i].name,
      regionLevel: RegionLevel.PROVINCIAL,
      parentId: national.regionId,
      sortOrder: i + 1,
      isActive: true,
    });
    provinces.push(province);
  }

  const cityData = [
    { provinceIndex: 0, code: '110100', name: '北京市辖区', abbr: '京' },
    { provinceIndex: 0, code: '110101', name: '东城区', abbr: '京' },
    { provinceIndex: 0, code: '110102', name: '西城区', abbr: '京' },
    { provinceIndex: 1, code: '310100', name: '上海市辖区', abbr: '沪' },
    { provinceIndex: 1, code: '310101', name: '黄浦区', abbr: '沪' },
    { provinceIndex: 1, code: '310104', name: '徐汇区', abbr: '沪' },
    { provinceIndex: 2, code: '440100', name: '广州市', abbr: '穗' },
    { provinceIndex: 2, code: '440300', name: '深圳市', abbr: '深' },
    { provinceIndex: 2, code: '440600', name: '佛山市', abbr: '佛' },
  ];

  const cities: Region[] = [];
  for (let i = 0; i < cityData.length; i++) {
    const city = await Region.create({
      regionCode: cityData[i].code,
      regionName: cityData[i].name,
      regionLevel: RegionLevel.MUNICIPAL,
      parentId: provinces[cityData[i].provinceIndex].regionId,
      sortOrder: i + 1,
      isActive: true,
    });
    cities.push(city);
  }

  console.log(`Seeded ${provinces.length} provinces and ${cities.length} cities`);
  return { national, provinces, cities };
};

export const seedAdminUser = async (nationalRegion: Region): Promise<User> => {
  console.log('Seeding admin user...');

  const passwordHash = await bcrypt.hash('123456', 10);

  const admin = await User.create({
    username: 'admin',
    passwordHash,
    realName: '系统管理员',
    phone: '13800138000',
    email: 'admin@water.gov.cn',
    department: '水环境管理局',
    position: '局长',
    userLevel: UserLevel.NATIONAL,
    regionId: nationalRegion.regionId,
    role: UserRole.ADMIN,
    permissions: { all: true },
    isActive: true,
    createdBy: 1,
  });

  console.log('Admin user created: admin/123456');
  return admin;
};

export const seedWaterBodies = async (cities: Region[]): Promise<WaterBody[]> => {
  console.log('Seeding water bodies...');

  const waterBodyData = [
    { name: '清河', type: WaterBodyType.RIVER, level: WaterBodyLevel.SEVERE_BLACK_ODOROUS, cityIndex: 0, length: 5.2, area: 15.6 },
    { name: '凉水河', type: WaterBodyType.RIVER, level: WaterBodyLevel.MILD_BLACK_ODOROUS, cityIndex: 0, length: 8.5, area: 25.5 },
    { name: '通惠河', type: WaterBodyType.RIVER, level: WaterBodyLevel.BLACK_ODOROUS, cityIndex: 1, length: 12.3, area: 36.9 },
    { name: '苏州河', type: WaterBodyType.RIVER, level: WaterBodyLevel.SEVERE_BLACK_ODOROUS, cityIndex: 3, length: 15.7, area: 47.1 },
    { name: '黄浦江支流', type: WaterBodyType.RIVER, level: WaterBodyLevel.MILD_BLACK_ODOROUS, cityIndex: 4, length: 9.8, area: 29.4 },
    { name: '淀山湖', type: WaterBodyType.LAKE, level: WaterBodyLevel.BLACK_ODOROUS, cityIndex: 5, length: 0, area: 62.0 },
    { name: '珠江广州段', type: WaterBodyType.RIVER, level: WaterBodyLevel.SEVERE_BLACK_ODOROUS, cityIndex: 6, length: 25.6, area: 76.8 },
    { name: '流溪河', type: WaterBodyType.RIVER, level: WaterBodyLevel.MILD_BLACK_ODOROUS, cityIndex: 6, length: 18.4, area: 55.2 },
    { name: '深圳河', type: WaterBodyType.RIVER, level: WaterBodyLevel.BLACK_ODOROUS, cityIndex: 7, length: 10.2, area: 30.6 },
    { name: '佛山水道', type: WaterBodyType.RIVER, level: WaterBodyLevel.SEVERE_BLACK_ODOROUS, cityIndex: 8, length: 12.8, area: 38.4 },
  ];

  const waterBodies: WaterBody[] = [];
  for (let i = 0; i < waterBodyData.length; i++) {
    const data = waterBodyData[i];
    const city = cities[data.cityIndex];
    const waterBody = await WaterBody.create({
      waterBodyCode: `WB${String(i + 1).padStart(4, '0')}`,
      waterBodyName: data.name,
      waterBodyType: data.type,
      waterBodyLevel: data.level,
      regionId: city.regionId,
      administrativeVillage: `${city.regionName}某村`,
      waterLength: data.length,
      waterArea: data.area,
      catchmentArea: data.area * 2.5,
      surroundingPopulation: Math.floor(Math.random() * 50000) + 10000,
      governanceStage: GovernanceStage.CONSTRUCTION,
      currentStatus: WaterBodyStatus.UNDER_GOVERNANCE,
      plannedCompletionDate: new Date(2025, 11, 31),
      totalInvestment: Math.floor(Math.random() * 50000000) + 10000000,
      usedFunds: Math.floor(Math.random() * 20000000) + 5000000,
      responsibleUnit: `${city.regionName}水务局`,
      responsiblePerson: '张治水',
      responsiblePhone: '13900139000',
      governanceMeasures: ['截污纳管', '清淤疏浚', '生态修复'],
      isActive: true,
    });
    waterBodies.push(waterBody);
  }

  console.log(`Seeded ${waterBodies.length} water bodies`);
  return waterBodies;
};

export const seedSewageOutlets = async (waterBodies: WaterBody[]): Promise<SewageOutlet[]> => {
  console.log('Seeding sewage outlets...');

  const outlets: SewageOutlet[] = [];
  const outletTypes = [OutletType.INDUSTRIAL, OutletType.DOMESTIC, OutletType.MIXED];
  const dischargeMethods = [DischargeMethod.DIRECT, DischargeMethod.OVERFLOW, DischargeMethod.UNDERGROUND];

  let outletIndex = 1;
  for (const waterBody of waterBodies) {
    const outletCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < outletCount; i++) {
      const outlet = await SewageOutlet.create({
        outletCode: `OUT${String(outletIndex).padStart(5, '0')}`,
        outletName: `${waterBody.waterBodyName}${i + 1}号排污口`,
        waterBodyId: waterBody.waterBodyId,
        outletType: outletTypes[Math.floor(Math.random() * outletTypes.length)],
        dischargeMethod: dischargeMethods[Math.floor(Math.random() * dischargeMethods.length)],
        designDischargeCapacity: Math.floor(Math.random() * 5000) + 1000,
        actualDischargeCapacity: Math.floor(Math.random() * 4000) + 500,
        location: {
          type: 'Point',
          coordinates: [
            116.397 + Math.random() * 0.5 - 0.25,
            39.908 + Math.random() * 0.5 - 0.25,
          ],
        },
        address: `${waterBody.waterBodyName}沿岸`,
        dischargeStandard: 'GB 8978-1996',
        monitoringEquipment: '在线监测仪',
        monitoringFrequency: '每日4次',
        responsibleUnit: '当地污水处理厂',
        contactPerson: '李监测',
        contactPhone: '13800138001',
        nh3nLimit: 8.0,
        tpLimit: 0.5,
        codLimit: 50.0,
        isMonitored: true,
        isActive: true,
      });
      outlets.push(outlet);
      outletIndex++;
    }
  }

  console.log(`Seeded ${outlets.length} sewage outlets`);
  return outlets;
};

export const seedWaterQualityData = async (outlets: SewageOutlet[]): Promise<void> => {
  console.log('Seeding water quality data (this may take a while)...');

  const today = new Date();
  const daysToSeed = 30;
  const samplesPerDay = 4;
  const hours = [2, 8, 14, 20];

  let totalRecords = 0;
  const batchSize = 100;
  let batch: any[] = [];

  for (const outlet of outlets) {
    for (let dayOffset = 0; dayOffset < daysToSeed; dayOffset++) {
      for (let sampleIndex = 0; sampleIndex < samplesPerDay; sampleIndex++) {
        const monitorTime = new Date(today);
        monitorTime.setDate(today.getDate() - dayOffset);
        monitorTime.setHours(hours[sampleIndex], 0, 0, 0);

        const ammoniaNitrogen = parseFloat((Math.random() * 15 + 2).toFixed(4));
        const totalPhosphorus = parseFloat((Math.random() * 2 + 0.1).toFixed(4));
        const cod = parseFloat((Math.random() * 100 + 20).toFixed(4));

        const isNh3nOverproof = ammoniaNitrogen > (outlet.nh3nLimit || 8);
        const isTpOverproof = totalPhosphorus > (outlet.tpLimit || 0.5);
        const isCodOverproof = cod > (outlet.codLimit || 50);
        const isCompliant = !isNh3nOverproof && !isTpOverproof && !isCodOverproof;

        const data = {
          outletId: outlet.outletId,
          monitorTime,
          waterTemperature: parseFloat((Math.random() * 20 + 10).toFixed(2)),
          phValue: parseFloat((Math.random() * 4 + 6).toFixed(2)),
          dissolvedOxygen: parseFloat((Math.random() * 5 + 1).toFixed(4)),
          ammoniaNitrogen,
          totalPhosphorus,
          totalNitrogen: parseFloat((Math.random() * 20 + 5).toFixed(4)),
          cod,
          bod5: parseFloat((Math.random() * 30 + 10).toFixed(4)),
          transparency: parseFloat((Math.random() * 50 + 10).toFixed(2)),
          oxidationReductionPotential: parseFloat((Math.random() * 200 - 50).toFixed(2)),
          conductivity: parseFloat((Math.random() * 500 + 200).toFixed(2)),
          turbidity: parseFloat((Math.random() * 100 + 10).toFixed(2)),
          flowRate: parseFloat((Math.random() * 100 + 10).toFixed(4)),
          isNh3nOverproof,
          isTpOverproof,
          isCompliant,
          dataQuality: DataQuality.VALID,
        };

        batch.push(data);
        totalRecords++;

        if (batch.length >= batchSize) {
          await WaterQualityData.bulkCreate(batch);
          batch = [];
        }
      }
    }
  }

  if (batch.length > 0) {
    await WaterQualityData.bulkCreate(batch);
  }

  console.log(`Seeded ${totalRecords} water quality records`);
};

export const seedGovernanceProjects = async (waterBodies: WaterBody[], adminUser: User): Promise<GovernanceProject[]> => {
  console.log('Seeding governance projects...');

  const projects: GovernanceProject[] = [];
  const projectTypes = [
    ProjectType.SEWAGE_INTERCEPTION,
    ProjectType.DREDGING,
    ProjectType.ECOLOGICAL_RESTORATION,
    ProjectType.WATER_CIRCULATION,
    ProjectType.NON_POINT_SOURCE_TREATMENT,
  ];

  const projectNames: Record<ProjectType, string> = {
    [ProjectType.SEWAGE_INTERCEPTION]: '截污纳管工程',
    [ProjectType.DREDGING]: '清淤疏浚工程',
    [ProjectType.ECOLOGICAL_RESTORATION]: '生态修复工程',
    [ProjectType.WATER_CIRCULATION]: '水体循环工程',
    [ProjectType.NON_POINT_SOURCE_TREATMENT]: '面源污染治理工程',
    [ProjectType.OTHER]: '其他治理工程',
  };

  let projectIndex = 1;
  for (const waterBody of waterBodies) {
    const projectCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < projectCount; i++) {
      const type = projectTypes[Math.floor(Math.random() * projectTypes.length)];
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2025, 11, 31);
      const plannedProgress = Math.floor(Math.random() * 100);
      const actualProgress = Math.max(0, Math.min(100, plannedProgress + Math.floor(Math.random() * 40) - 20));

      const project = await GovernanceProject.create({
        projectCode: `PRJ${String(projectIndex).padStart(5, '0')}`,
        projectName: `${waterBody.waterBodyName}${projectNames[type]}`,
        waterBodyId: waterBody.waterBodyId,
        projectType: type,
        projectScale: `治理长度${waterBody.waterLength}公里，投资约${Math.floor(Math.random() * 2000 + 500)}万元`,
        technologyType: '综合处理技术',
        contractor: '环保工程有限公司',
        supervisionUnit: '工程监理有限公司',
        designUnit: '市政工程设计研究院',
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        actualStartDate: startDate,
        plannedInvestment: Math.floor(Math.random() * 30000000) + 5000000,
        approvedBudget: Math.floor(Math.random() * 28000000) + 4500000,
        actualPayment: Math.floor(Math.random() * 15000000) + 1000000,
        plannedProgress,
        actualProgress,
        progressDeviation: plannedProgress - actualProgress,
        projectStatus: actualProgress >= 100 ? ProjectStatus.COMPLETED :
          actualProgress >= 50 ? ProjectStatus.UNDER_CONSTRUCTION : ProjectStatus.NOT_STARTED,
        qualityStatus: Math.random() > 0.2 ? 1 : 2,
        mainProblems: Math.random() > 0.5 ? '资金拨付进度较慢' : '',
        isKeyProject: Math.random() > 0.7,
      });
      projects.push(project);
      projectIndex++;
    }
  }

  console.log(`Seeded ${projects.length} governance projects`);
  return projects;
};

export const seedComplaintOrders = async (waterBodies: WaterBody[], cities: Region[]): Promise<ComplaintOrder[]> => {
  console.log('Seeding complaint orders...');

  const complaints: ComplaintOrder[] = [];
  const complaintContents = [
    '水体发黑发臭，严重影响周边居民生活',
    '发现有污水直排现象，颜色异常',
    '水面漂浮大量垃圾，无人清理',
    '河边植被被破坏，水土流失严重',
    '污水处理设施损坏，急需维修',
    '河道淤积严重，排水不畅',
    '水体有异味，夏天难以开窗',
    '发现有人向河内倾倒垃圾',
  ];

  const statuses = [OrderStatus.PENDING_ACCEPTANCE, OrderStatus.PROCESSING, OrderStatus.PROCESSED, OrderStatus.CLOSED];

  for (let i = 0; i < 20; i++) {
    const waterBody = waterBodies[Math.floor(Math.random() * waterBodies.length)];
    const complaintTime = new Date();
    complaintTime.setDate(complaintTime.getDate() - Math.floor(Math.random() * 30));

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const complaint = await ComplaintOrder.create({
      complaintCode: `CP${String(i + 1).padStart(6, '0')}`,
      waterBodyId: waterBody.waterBodyId,
      regionId: waterBody.regionId,
      source: [ComplaintSource.PHONE, ComplaintSource.WECHAT, ComplaintSource.WEBSITE, ComplaintSource.APP][Math.floor(Math.random() * 4)],
      complaintType: [ComplaintType.BLACK_ODOROUS, ComplaintType.SEWAGE_DISCHARGE, ComplaintType.FLOATING_GARBAGE, ComplaintType.OTHER][Math.floor(Math.random() * 4)],
      complaintContent: complaintContents[Math.floor(Math.random() * complaintContents.length)],
      complaintTime,
      complainantName: `市民${i + 1}`,
      complainantPhone: `13800${String(138001 + i).slice(-6)}`,
      complainantAddress: `${cities[Math.floor(Math.random() * cities.length)].regionName}某街道`,
      location: {
        type: 'Point',
        coordinates: [
          116.397 + Math.random() * 0.5 - 0.25,
          39.908 + Math.random() * 0.5 - 0.25,
        ],
      },
      locationDescription: `${waterBody.waterBodyName}某段`,
      priority: [Priority.URGENT, Priority.NORMAL, Priority.LOW][Math.floor(Math.random() * 3)],
      orderStatus: status,
      satisfactionScore: status === OrderStatus.CLOSED ? Math.floor(Math.random() * 3) + 3 : undefined,
      satisfactionFeedback: status === OrderStatus.CLOSED ? (Math.random() > 0.5 ? '处理及时，效果良好' : '处理结果基本满意') : undefined,
      hotKeywords: ['黑臭', '污水', '垃圾'].slice(0, Math.floor(Math.random() * 2) + 1),
      handlerUnit: waterBody.responsibleUnit,
      handlerPerson: waterBody.responsiblePerson,
      deadline: new Date(complaintTime.getTime() + 7 * 24 * 60 * 60 * 1000),
      acceptTime: status !== OrderStatus.PENDING_ACCEPTANCE ? new Date(complaintTime.getTime() + 2 * 60 * 60 * 1000) : undefined,
      processStartTime: [OrderStatus.PROCESSING, OrderStatus.PROCESSED, OrderStatus.CLOSED].includes(status)
        ? new Date(complaintTime.getTime() + 4 * 60 * 60 * 1000) : undefined,
      processEndTime: [OrderStatus.PROCESSED, OrderStatus.CLOSED].includes(status)
        ? new Date(complaintTime.getTime() + 3 * 24 * 60 * 60 * 1000) : undefined,
      processResult: [OrderStatus.PROCESSED, OrderStatus.CLOSED].includes(status)
        ? '已完成现场核查，责令相关单位整改，目前水质已有所改善' : undefined,
    });
    complaints.push(complaint);
  }

  console.log(`Seeded ${complaints.length} complaint orders`);
  return complaints;
};

export const seedSystemConfigs = async (adminUser: User): Promise<SystemConfig[]> => {
  console.log('Seeding system configs...');

  const configs = [
    { key: 'system.name', value: '水环境管理系统', type: ConfigType.STRING, desc: '系统名称', editable: true },
    { key: 'system.version', value: '1.0.0', type: ConfigType.STRING, desc: '系统版本号', editable: false },
    { key: 'water_quality.nh3n_limit', value: '8.0', type: ConfigType.NUMBER, desc: '氨氮排放标准(mg/L)', editable: true },
    { key: 'water_quality.tp_limit', value: '0.5', type: ConfigType.NUMBER, desc: '总磷排放标准(mg/L)', editable: true },
    { key: 'water_quality.cod_limit', value: '50.0', type: ConfigType.NUMBER, desc: 'COD排放标准(mg/L)', editable: true },
    { key: 'water_quality.monitoring_frequency', value: '4', type: ConfigType.INTEGER, desc: '每日监测次数', editable: true },
    { key: 'alert.overproof_threshold', value: '3', type: ConfigType.INTEGER, desc: '连续超标次数触发预警', editable: true },
    { key: 'alert.auto_push', value: 'true', type: ConfigType.BOOLEAN, desc: '是否自动推送预警', editable: true },
    { key: 'approval.workflow_stages', value: '3', type: ConfigType.INTEGER, desc: '审批流程级数', editable: true },
    { key: 'complaint.auto_accept', value: 'true', type: ConfigType.BOOLEAN, desc: '投诉是否自动受理', editable: true },
    { key: 'complaint.deadline_days', value: '7', type: ConfigType.INTEGER, desc: '投诉处理期限(天)', editable: true },
    { key: 'report.auto_generate_weekly', value: 'true', type: ConfigType.BOOLEAN, desc: '是否自动生成周报', editable: true },
    { key: 'report.auto_generate_monthly', value: 'true', type: ConfigType.BOOLEAN, desc: '是否自动生成月报', editable: true },
    { key: 'stats.realtime_refresh_interval', value: '300', type: ConfigType.INTEGER, desc: '实时统计刷新间隔(秒)', editable: true },
    { key: 'security.password_min_length', value: '6', type: ConfigType.INTEGER, desc: '密码最小长度', editable: true },
    { key: 'security.session_timeout', value: '3600', type: ConfigType.INTEGER, desc: '会话超时时间(秒)', editable: true },
    { key: 'upload.max_file_size', value: '10485760', type: ConfigType.INTEGER, desc: '最大上传文件大小(字节)', editable: true },
    { key: 'upload.allowed_types', value: '["jpg","jpeg","png","pdf","doc","docx","xlsx"]', type: ConfigType.JSON, desc: '允许上传的文件类型', editable: true },
  ];

  const createdConfigs: SystemConfig[] = [];
  for (const config of configs) {
    const created = await SystemConfig.create({
      configKey: config.key,
      configValue: config.value,
      configType: config.type,
      description: config.desc,
      isEditable: config.editable,
      updatedBy: adminUser.userId,
    });
    createdConfigs.push(created);
  }

  console.log(`Seeded ${createdConfigs.length} system configs`);
  return createdConfigs;
};

export const seedAllData = async (): Promise<void> => {
  console.log('='.repeat(60));
  console.log('Starting data initialization...');
  console.log('='.repeat(60));

  const { national, cities } = await seedRegions();
  const adminUser = await seedAdminUser(national);
  const waterBodies = await seedWaterBodies(cities);
  const outlets = await seedSewageOutlets(waterBodies);
  await seedWaterQualityData(outlets);
  await seedGovernanceProjects(waterBodies, adminUser);
  await seedComplaintOrders(waterBodies, cities);
  await seedSystemConfigs(adminUser);

  console.log('='.repeat(60));
  console.log('Data initialization completed successfully!');
  console.log('='.repeat(60));
};
