-- =============================================
-- 城市黑臭水体治理监管平台数据库设计
-- Database Schema for Urban Black & Odorous Water Governance Platform
-- =============================================

-- 启用 PostGIS 扩展用于地理空间数据
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- =============================================
-- 1. 行政区划表 (Regions)
-- 支持国家、省、市三级行政区划
-- =============================================
CREATE TABLE regions (
    region_id SERIAL PRIMARY KEY,
    region_code VARCHAR(12) NOT NULL UNIQUE, -- 行政区划编码: 国家000000, 省110000, 市110100
    region_name VARCHAR(100) NOT NULL,
    region_level SMALLINT NOT NULL CHECK (region_level IN (1, 2, 3)), -- 1:国家 2:省级 3:市级
    parent_id INTEGER REFERENCES regions(region_id),
    geom GEOMETRY(MultiPolygon, 4326), -- 地理边界数据
    center_point GEOMETRY(Point, 4326), -- 中心点坐标
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_region_level (region_level),
    INDEX idx_parent_id (parent_id),
    INDEX idx_region_code (region_code)
);

-- =============================================
-- 2. 用户表 (Users)
-- 支持三级权限管理
-- =============================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    department VARCHAR(100), -- 所属部门: 住建局/生态环境局/财务科 等
    position VARCHAR(50),
    user_level SMALLINT NOT NULL CHECK (user_level IN (1, 2, 3)), -- 1:国家级 2:省级 3:市级
    region_id INTEGER NOT NULL REFERENCES regions(region_id), -- 管辖区域
    role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- admin/approver/auditor/viewer
    permissions JSONB, -- 精细权限配置
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    INDEX idx_user_level (user_level),
    INDEX idx_region_id (region_id),
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- =============================================
-- 3. 水体基础信息表 (Water Bodies)
-- =============================================
CREATE TABLE water_bodies (
    water_body_id SERIAL PRIMARY KEY,
    water_body_code VARCHAR(50) NOT NULL UNIQUE, -- 水体编号
    water_body_name VARCHAR(100) NOT NULL,
    water_body_type SMALLINT NOT NULL, -- 1:河流 2:湖泊 3:塘沟 4:其他
    water_body_level SMALLINT NOT NULL, -- 1:黑臭级 2:轻度黑臭 3:重度黑臭 4:已消除
    region_id INTEGER NOT NULL REFERENCES regions(region_id),
    administrative_village VARCHAR(100),
    start_point GEOMETRY(Point, 4326),
    end_point GEOMETRY(Point, 4326),
    water_length NUMERIC(10, 2), -- 长度(公里)
    water_area NUMERIC(10, 2), -- 面积(平方公里)
    catchment_area NUMERIC(10, 2), -- 汇水面积
    surrounding_population INTEGER, -- 周边人口
    governance_stage SMALLINT NOT NULL DEFAULT 1, -- 1:方案制定 2:工程施工 3:效果评估 4:长制久清
    current_status SMALLINT NOT NULL DEFAULT 1, -- 1:治理中 2:已完成 3:反弹 4:已销号
    planned_completion_date DATE,
    actual_completion_date DATE,
    total_investment NUMERIC(15, 2), -- 总投资(万元)
    used_funds NUMERIC(15, 2) DEFAULT 0, -- 已使用资金
    responsible_unit VARCHAR(200), -- 责任单位
    responsible_person VARCHAR(50),
    responsible_phone VARCHAR(20),
    governance_measures TEXT[], -- 治理措施: 如 ['截污纳管','清淤疏浚','生态修复']
    geom GEOMETRY(LineString, 4326), -- 水体中心线
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_region_id (region_id),
    INDEX idx_water_body_level (water_body_level),
    INDEX idx_governance_stage (governance_stage),
    INDEX idx_current_status (current_status),
    INDEX idx_water_body_code (water_body_code),
    INDEX idx_geom USING gist (geom)
);

-- =============================================
-- 4. 排污口信息表 (Sewage Outlets)
-- =============================================
CREATE TABLE sewage_outlets (
    outlet_id SERIAL PRIMARY KEY,
    outlet_code VARCHAR(50) NOT NULL UNIQUE, -- 排污口编号
    outlet_name VARCHAR(100) NOT NULL,
    water_body_id INTEGER NOT NULL REFERENCES water_bodies(water_body_id),
    outlet_type SMALLINT NOT NULL, -- 1:工业排污口 2:生活排污口 3:混合排污口 4:农业面源
    discharge_method SMALLINT, -- 1:直排 2:溢流 3:暗渠
    design_discharge_capacity NUMERIC(10, 2), -- 设计排放量(m³/d)
    actual_discharge_capacity NUMERIC(10, 2), -- 实际排放量
    location GEOMETRY(Point, 4326) NOT NULL,
    address VARCHAR(200),
    discharge_standard VARCHAR(50), -- 执行排放标准
    monitoring_equipment VARCHAR(200), -- 监测设备型号
    monitoring_frequency VARCHAR(50), -- 监测频率: 实时/每日/每周
    responsible_unit VARCHAR(200),
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    nh3n_limit NUMERIC(8, 4), -- 氨氮标准限值(mg/L)
    tp_limit NUMERIC(8, 4), -- 总磷标准限值(mg/L)
    cod_limit NUMERIC(8, 4), -- COD标准限值
    is_monitored BOOLEAN DEFAULT TRUE, -- 是否在线监测
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_water_body_id (water_body_id),
    INDEX idx_outlet_type (outlet_type),
    INDEX idx_is_monitored (is_monitored),
    INDEX idx_location USING gist (location)
);

-- =============================================
-- 5. 水质在线监测数据表 (Water Quality Monitoring Data)
-- =============================================
CREATE TABLE water_quality_data (
    data_id BIGSERIAL PRIMARY KEY,
    outlet_id INTEGER NOT NULL REFERENCES sewage_outlets(outlet_id),
    monitor_time TIMESTAMP NOT NULL,
    water_temperature NUMERIC(6, 2), -- 水温(°C)
    ph_value NUMERIC(5, 2), -- pH值
    dissolved_oxygen NUMERIC(8, 4), -- 溶解氧(mg/L)
    ammonia_nitrogen NUMERIC(8, 4), -- 氨氮(mg/L)
    total_phosphorus NUMERIC(8, 4), -- 总磷(mg/L)
    total_nitrogen NUMERIC(8, 4), -- 总氮(mg/L)
    cod NUMERIC(10, 4), -- 化学需氧量(mg/L)
    bod5 NUMERIC(10, 4), -- 五日生化需氧量
    transparency NUMERIC(8, 2), -- 透明度(cm)
    oxidation_reduction_potential NUMERIC(8, 2), -- 氧化还原电位
    conductivity NUMERIC(10, 2), -- 电导率
    turbidity NUMERIC(10, 2), -- 浊度
    flow_rate NUMERIC(10, 4), -- 流量(m³/s)
    is_nh3n_overproof BOOLEAN DEFAULT FALSE, -- 氨氮是否超标
    is_tp_overproof BOOLEAN DEFAULT FALSE, -- 总磷是否超标
    is_compliant BOOLEAN DEFAULT TRUE, -- 是否达标
    data_quality SMALLINT DEFAULT 1, -- 1:有效 2:无效 3:修约 4:补全
    raw_data JSONB, -- 原始报文数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_outlet_time (outlet_id, monitor_time),
    INDEX idx_monitor_time (monitor_time),
    INDEX idx_is_nh3n_overproof (is_nh3n_overproof),
    INDEX idx_is_tp_overproof (is_tp_overproof),
    INDEX idx_is_compliant (is_compliant),
    INDEX idx_data_quality (data_quality)
);

-- 创建分区表 - 按月份分区
CREATE TABLE water_quality_data_2024 PARTITION OF water_quality_data
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE water_quality_data_2025 PARTITION OF water_quality_data
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE water_quality_data_2026 PARTITION OF water_quality_data
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- =============================================
-- 6. 治理工程项目表 (Governance Projects)
-- =============================================
CREATE TABLE governance_projects (
    project_id SERIAL PRIMARY KEY,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    water_body_id INTEGER NOT NULL REFERENCES water_bodies(water_body_id),
    project_type SMALLINT NOT NULL, -- 1:截污纳管 2:清淤疏浚 3:生态修复 4:活水循环 5:面源治理 6:其他
    project_scale TEXT, -- 工程规模描述
    technology_type VARCHAR(100), -- 治理工艺类型
    contractor VARCHAR(200), -- 施工单位
    supervision_unit VARCHAR(200), -- 监理单位
    design_unit VARCHAR(200), -- 设计单位
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    planned_investment NUMERIC(15, 2), -- 计划投资(万元)
    approved_budget NUMERIC(15, 2), -- 批复预算
    actual_payment NUMERIC(15, 2) DEFAULT 0, -- 实际拨付
    planned_progress NUMERIC(5, 2) DEFAULT 0, -- 计划进度(%)
    actual_progress NUMERIC(5, 2) DEFAULT 0, -- 实际进度(%)
    progress_deviation NUMERIC(6, 2) DEFAULT 0, -- 进度偏差(%)
    project_status SMALLINT NOT NULL DEFAULT 1, -- 1:未开工 2:施工中 3:已完工 4:已验收 5:已延期
    quality_status SMALLINT, -- 1:优秀 2:合格 3:不合格
    main_problems TEXT, -- 主要问题
    is_key_project BOOLEAN DEFAULT FALSE, -- 是否重点项目
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_water_body_id (water_body_id),
    INDEX idx_project_type (project_type),
    INDEX idx_project_status (project_status),
    INDEX idx_progress_deviation (progress_deviation)
);

-- =============================================
-- 7. 工程进度月报表 (Project Monthly Progress Reports)
-- =============================================
CREATE TABLE project_progress_reports (
    report_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES governance_projects(project_id),
    report_period VARCHAR(7) NOT NULL, -- 报告月份: YYYY-MM
    report_date DATE NOT NULL,
    monthly_plan_content TEXT, -- 本月计划内容
    monthly_actual_content TEXT, -- 本月完成内容
    monthly_planned_progress NUMERIC(5, 2), -- 本月计划进度
    monthly_actual_progress NUMERIC(5, 2), -- 本月实际进度
    cumulative_planned_progress NUMERIC(5, 2), -- 累计计划进度
    cumulative_actual_progress NUMERIC(5, 2), -- 累计实际进度
    monthly_investment_plan NUMERIC(15, 2), -- 本月计划投资
    monthly_actual_investment NUMERIC(15, 2), -- 本月实际投资
    cumulative_investment NUMERIC(15, 2), -- 累计投资
    construction_personnel INTEGER, -- 施工人员数量
    equipment_count INTEGER, -- 设备数量
    existing_problems TEXT, -- 存在问题
    next_month_plan TEXT, -- 下月计划
    support_needed TEXT, -- 需要协调的事项
    attachments JSONB, -- 附件列表
    report_status SMALLINT DEFAULT 1, -- 1:草稿 2:已提交 3:已审核
    submitted_by INTEGER REFERENCES users(user_id),
    submitted_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(user_id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, report_period),
    INDEX idx_project_period (project_id, report_period),
    INDEX idx_report_status (report_status)
);

-- =============================================
-- 8. 公众投诉工单表 (Public Complaint Work Orders)
-- =============================================
CREATE TABLE complaint_orders (
    complaint_id SERIAL PRIMARY KEY,
    complaint_code VARCHAR(50) NOT NULL UNIQUE,
    water_body_id INTEGER REFERENCES water_bodies(water_body_id),
    region_id INTEGER REFERENCES regions(region_id),
    source SMALLINT NOT NULL, -- 1:电话 2:微信 3:网站 4:APP 5:信件 6:现场
    complaint_type SMALLINT NOT NULL, -- 1:黑臭 2:污水直排 3:垃圾漂浮 4:绿化破坏 5:设施损坏 6:其他
    complaint_content TEXT NOT NULL,
    complaint_time TIMESTAMP NOT NULL,
    complainant_name VARCHAR(50),
    complainant_phone VARCHAR(20),
    complainant_address VARCHAR(200),
    location GEOMETRY(Point, 4326),
    location_description VARCHAR(200),
    attachments JSONB, -- 投诉图片/视频
    priority SMALLINT DEFAULT 2, -- 1:紧急 2:一般 3:普通
    order_status SMALLINT NOT NULL DEFAULT 1, -- 1:待受理 2:处理中 3:已处理 4:已回访 5:已结案
    satisfaction_score SMALLINT, -- 满意度评分 1-5
    satisfaction_feedback TEXT, -- 满意度反馈
    hot_keywords VARCHAR(200)[], -- 热词标签
    handler_unit VARCHAR(200), -- 处理单位
    handler_person VARCHAR(50), -- 处理人
    deadline TIMESTAMP, -- 办理时限
    accept_time TIMESTAMP, -- 受理时间
    process_start_time TIMESTAMP, -- 开始处理时间
    process_end_time TIMESTAMP, -- 处理完成时间
    process_result TEXT, -- 处理结果
    review_time TIMESTAMP, -- 回访时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_water_body_id (water_body_id),
    INDEX idx_region_id (region_id),
    INDEX idx_complaint_type (complaint_type),
    INDEX idx_order_status (order_status),
    INDEX idx_complaint_time (complaint_time),
    INDEX idx_priority (priority),
    INDEX idx_location USING gist (location)
);

-- =============================================
-- 9. 生态修复评估报告表 (Ecological Restoration Assessment Reports)
-- =============================================
CREATE TABLE ecological_assessments (
    assessment_id SERIAL PRIMARY KEY,
    assessment_code VARCHAR(50) NOT NULL UNIQUE,
    water_body_id INTEGER NOT NULL REFERENCES water_bodies(water_body_id),
    assessment_type SMALLINT NOT NULL, -- 1:季度评估 2:年度评估 3:竣工验收评估 4:专项评估
    assessment_date DATE NOT NULL,
    assessment_period VARCHAR(20), -- 评估时段
    water_quality_score NUMERIC(5, 2), -- 水质指标评分
    ecological_index NUMERIC(5, 2), -- 生态指标评分
    landscape_score NUMERIC(5, 2), -- 景观指标评分
    management_score NUMERIC(5, 2), -- 管理指标评分
    comprehensive_score NUMERIC(5, 2), -- 综合评分
    assessment_level VARCHAR(10), -- 评估等级: 优秀/良好/合格/不合格
    biodiversity_index NUMERIC(8, 4), -- 生物多样性指数
    vegetation_coverage NUMERIC(5, 2), -- 植被覆盖率(%)
    habitat_quality NUMERIC(5, 2), -- 生境质量
    water_environment_capacity NUMERIC(10, 4), -- 水环境容量
    existing_problems TEXT, -- 存在问题
    improvement_suggestions TEXT, -- 改进建议
    assessment_organization VARCHAR(200), -- 评估单位
    assessment_experts VARCHAR(500), -- 评估专家
    assessment_report_url VARCHAR(500), -- 评估报告附件
    assessor_id INTEGER REFERENCES users(user_id),
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES users(user_id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_water_body_id (water_body_id),
    INDEX idx_assessment_type (assessment_type),
    INDEX idx_assessment_date (assessment_date),
    INDEX idx_assessment_level (assessment_level)
);

-- =============================================
-- 10. 预警信息表 (Alerts)
-- =============================================
CREATE TABLE alerts (
    alert_id SERIAL PRIMARY KEY,
    alert_code VARCHAR(50) NOT NULL UNIQUE,
    alert_type SMALLINT NOT NULL, -- 1:水质超标预警 2:进度滞后预警 3:资金异常预警 4:投诉集中预警
    alert_level SMALLINT NOT NULL, -- 1:一级预警(红色) 2:二级预警(橙色) 3:三级预警(黄色)
    source_type SMALLINT NOT NULL, -- 1:排污口 2:水体 3:项目 4:区域
    source_id INTEGER NOT NULL, -- 关联对象ID
    source_code VARCHAR(50),
    source_name VARCHAR(200),
    region_id INTEGER REFERENCES regions(region_id),
    trigger_condition TEXT, -- 触发条件
    trigger_value NUMERIC(15, 4), -- 触发值
    threshold_value NUMERIC(15, 4), -- 阈值
    alert_content TEXT NOT NULL, -- 预警内容
    alert_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    alert_status SMALLINT NOT NULL DEFAULT 1, -- 1:待处理 2:处理中 3:已处理 4:已消除 5:已忽略
    push_targets JSONB, -- 推送目标部门和人员
    push_status SMALLINT DEFAULT 0, -- 0:未推送 1:推送中 2:已推送 3:推送失败
    push_time TIMESTAMP,
    handler_unit VARCHAR(200), -- 处置单位
    handler_person VARCHAR(50),
    handle_deadline TIMESTAMP,
    handle_measure TEXT, -- 处置措施
    handle_result TEXT, -- 处置结果
    handle_time TIMESTAMP,
    handle_files JSONB, -- 处置附件
    is_approval_needed BOOLEAN DEFAULT FALSE, -- 是否需要启动审批
    related_approval_id INTEGER, -- 关联审批流程
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert_type (alert_type),
    INDEX idx_alert_level (alert_level),
    INDEX idx_alert_status (alert_status),
    INDEX idx_alert_time (alert_time),
    INDEX idx_region_id (region_id),
    INDEX idx_source (source_type, source_id)
);

-- =============================================
-- 11. 审批流程表 (Approval Workflows)
-- 三级审批: 治理单位确认 → 区级主管部门复核 → 市级政府批准
-- =============================================
CREATE TABLE approval_workflows (
    workflow_id SERIAL PRIMARY KEY,
    workflow_code VARCHAR(50) NOT NULL UNIQUE,
    workflow_type SMALLINT NOT NULL, -- 1:治理方案调整 2:应急截污启动 3:项目延期 4:资金调整
    related_alert_id INTEGER REFERENCES alerts(alert_id),
    project_id INTEGER REFERENCES governance_projects(project_id),
    water_body_id INTEGER REFERENCES water_bodies(water_body_id),
    region_id INTEGER REFERENCES regions(region_id),
    applicant_id INTEGER NOT NULL REFERENCES users(user_id),
    applicant_unit VARCHAR(200),
    application_content TEXT NOT NULL, -- 申请内容
    application_reason TEXT NOT NULL, -- 申请理由
    proposed_scheme TEXT, -- 建议方案
    expected_effect TEXT, -- 预期效果
    attachments JSONB,
    current_stage SMALLINT NOT NULL DEFAULT 1, -- 1:待治理单位确认 2:待区级复核 3:待市级批准 4:已完成 5:已驳回
    workflow_status SMALLINT NOT NULL DEFAULT 1, -- 1:审批中 2:已通过 3:已驳回 4:已撤销
    stage1_handler INTEGER REFERENCES users(user_id), -- 一级审批人
    stage1_opinion TEXT, -- 一级审批意见
    stage1_result SMALLINT, -- 1:通过 2:驳回
    stage1_time TIMESTAMP,
    stage2_handler INTEGER REFERENCES users(user_id), -- 二级审批人
    stage2_opinion TEXT, -- 二级审批意见
    stage2_result SMALLINT,
    stage2_time TIMESTAMP,
    stage3_handler INTEGER REFERENCES users(user_id), -- 三级审批人
    stage3_opinion TEXT, -- 三级审批意见
    stage3_result SMALLINT,
    stage3_time TIMESTAMP,
    final_result TEXT, -- 最终审批结果
    final_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_workflow_type (workflow_type),
    INDEX idx_current_stage (current_stage),
    INDEX idx_workflow_status (workflow_status),
    INDEX idx_related_alert (related_alert_id),
    INDEX idx_region_id (region_id),
    INDEX idx_water_body_id (water_body_id)
);

-- 审批操作历史
CREATE TABLE approval_history (
    history_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES approval_workflows(workflow_id),
    stage SMALLINT NOT NULL,
    operator_id INTEGER NOT NULL REFERENCES users(user_id),
    operation_type SMALLINT NOT NULL, -- 1:提交 2:通过 3:驳回 4:补正 5:撤销
    opinion TEXT,
    operation_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attachments JSONB,
    INDEX idx_workflow_id (workflow_id),
    INDEX idx_stage (stage)
);

-- =============================================
-- 12. 年度治理任务书 (Annual Governance Tasks)
-- =============================================
CREATE TABLE annual_tasks (
    task_id SERIAL PRIMARY KEY,
    task_code VARCHAR(50) NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    region_id INTEGER NOT NULL REFERENCES regions(region_id),
    water_body_id INTEGER REFERENCES water_bodies(water_body_id),
    task_type SMALLINT NOT NULL, -- 1:水体消除 2:工程建设 3:水质提升 4:生态修复
    task_content TEXT NOT NULL,
    target_indicator JSONB, -- 目标指标
    planned_start_date DATE,
    planned_end_date DATE,
    planned_budget NUMERIC(15, 2), -- 计划预算
    allocated_funds NUMERIC(15, 2) DEFAULT 0, -- 已拨付资金
    actual_expenditure NUMERIC(15, 2) DEFAULT 0, -- 实际支出
    budget_deviation NUMERIC(6, 2) DEFAULT 0, -- 预算偏差率(%)
    task_status SMALLINT DEFAULT 1, -- 1:未开始 2:进行中 3:已完成 4:已延期
    completion_rate NUMERIC(5, 2) DEFAULT 0, -- 完成率(%)
    fund_match_status SMALLINT, -- 1:匹配 2:基本匹配 3:不匹配
    is_budget_abnormal BOOLEAN DEFAULT FALSE, -- 预算是否异常
    abnormal_reminder TEXT, -- 异常提醒内容
    upload_user_id INTEGER REFERENCES users(user_id),
    upload_time TIMESTAMP,
    excel_file_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (year, region_id, water_body_id, task_type),
    INDEX idx_year_region (year, region_id),
    INDEX idx_task_status (task_status),
    INDEX idx_is_budget_abnormal (is_budget_abnormal)
);

-- 资金拨付明细表
CREATE TABLE fund_disbursements (
    disbursement_id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES annual_tasks(task_id),
    project_id INTEGER REFERENCES governance_projects(project_id),
    disbursement_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    fund_type SMALLINT NOT NULL, -- 1:中央财政 2:省级财政 3:市级财政 4:自筹 5:其他
    purpose TEXT,
    recipient_unit VARCHAR(200),
    payment_status SMALLINT DEFAULT 1, -- 1:待支付 2:已支付 3:已退回
    payment_voucher VARCHAR(200),
    operator_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_project_id (project_id),
    INDEX idx_disbursement_date (disbursement_date)
);

-- =============================================
-- 13. 实时统计表 (Real-time Statistics)
-- 存储实时计算结果，提高查询性能
-- =============================================
CREATE TABLE realtime_stats (
    stat_id SERIAL PRIMARY KEY,
    stat_type SMALLINT NOT NULL, -- 1:区域统计 2:水体统计 3:排污口统计 4:项目统计
    region_id INTEGER REFERENCES regions(region_id),
    water_body_id INTEGER REFERENCES water_bodies(water_body_id),
    outlet_id INTEGER REFERENCES sewage_outlets(outlet_id),
    project_id INTEGER REFERENCES governance_projects(project_id),
    stat_date DATE NOT NULL,
    stat_period VARCHAR(10), -- day/week/month/quarter/year
    water_quality_compliance_rate NUMERIC(5, 2), -- 水质达标率
    governance_completion_rate NUMERIC(5, 2), -- 治理完成率
    public_satisfaction NUMERIC(5, 2), -- 公众满意度
    outlet_abnormality_index NUMERIC(8, 4), -- 排污口异常指数
    overproof_count INTEGER DEFAULT 0, -- 超标次数
    total_monitor_count INTEGER DEFAULT 0, -- 监测总次数
    complaint_count INTEGER DEFAULT 0, -- 投诉数量
    completed_project_count INTEGER DEFAULT 0, -- 已完成项目数
    total_project_count INTEGER DEFAULT 0, -- 项目总数
    alert_count INTEGER DEFAULT 0, -- 预警数量
    additional_data JSONB, -- 其他统计数据
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (stat_type, region_id, water_body_id, outlet_id, project_id, stat_date, stat_period),
    INDEX idx_stat_type_date (stat_type, stat_date, region_id)
);

-- =============================================
-- 14. 治理诊断周报表 (Weekly Governance Diagnosis Reports)
-- =============================================
CREATE TABLE weekly_diagnosis_reports (
    report_id SERIAL PRIMARY KEY,
    report_code VARCHAR(50) NOT NULL UNIQUE,
    report_week INTEGER NOT NULL,
    report_year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    region_id INTEGER NOT NULL REFERENCES regions(region_id),
    water_quality_compliance_rate NUMERIC(5, 2),
    qoq_compliance_rate NUMERIC(6, 2), -- 环比变化
    yoy_compliance_rate NUMERIC(6, 2), -- 同比变化
    governance_completion_rate NUMERIC(5, 2),
    qoq_completion_rate NUMERIC(6, 2),
    yoy_completion_rate NUMERIC(6, 2),
    public_satisfaction NUMERIC(5, 2),
    qoq_satisfaction NUMERIC(6, 2),
    yoy_satisfaction NUMERIC(6, 2),
    complaint_type_distribution JSONB, -- 投诉类型分布
    project_delay_analysis JSONB, -- 工程延误原因分析
    trend_analysis TEXT, -- 趋势分析
    technical_route_recommendations TEXT, -- 优化技术路线推荐
    fund_allocation_scheme TEXT, -- 资金调度方案
    key_problems TEXT, -- 重点问题
    report_content JSONB, -- 完整报告内容
    report_file_url VARCHAR(500), -- 报告文件
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_year_week_region (report_year, report_week, region_id)
);

-- =============================================
-- 15. 系统配置表 (System Configurations)
-- =============================================
CREATE TABLE system_configs (
    config_id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string',
    description VARCHAR(500),
    is_editable BOOLEAN DEFAULT TRUE,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
);

-- =============================================
-- 16. 操作日志表 (Operation Logs)
-- =============================================
CREATE TABLE operation_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    username VARCHAR(50),
    operation_type VARCHAR(50) NOT NULL,
    module_name VARCHAR(50),
    operation_content TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    request_params JSONB,
    response_result JSONB,
    operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time INTEGER, -- 执行时间(毫秒)
    is_success BOOLEAN DEFAULT TRUE,
    INDEX idx_user_id (user_id),
    INDEX idx_operation_time (operation_time),
    INDEX idx_operation_type (operation_type),
    INDEX idx_module_name (module_name)
);

-- =============================================
-- 17. 消息推送记录表 (Message Push Logs)
-- =============================================
CREATE TABLE message_push_logs (
    push_id BIGSERIAL PRIMARY KEY,
    message_type SMALLINT NOT NULL, -- 1:预警 2:审批 3:通知 4:报告
    related_id INTEGER,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    receiver_type SMALLINT NOT NULL, -- 1:用户 2:部门 3:角色
    receiver_ids INTEGER[],
    push_channels VARCHAR(20)[], -- ['sms','app','email','wechat']
    push_status SMALLINT DEFAULT 0, -- 0:待发送 1:发送中 2:已发送 3:发送失败
    push_time TIMESTAMP,
    read_status JSONB, -- 各接收者阅读状态
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_message_type (message_type),
    INDEX idx_push_status (push_status),
    INDEX idx_created_at (created_at)
);

-- =============================================
-- 初始化数据
-- =============================================

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description, is_editable) VALUES
('alert.overproof_days', '3', 'integer', '连续超标天数触发预警', TRUE),
('alert.progress_deviation_threshold', '30', 'number', '进度偏差阈值(%)', TRUE),
('alert.budget_deviation_threshold', '15', 'number', '预算偏差阈值(%)', TRUE),
('water_quality.nh3n_limit', '1.5', 'number', '氨氮标准限值(mg/L)', TRUE),
('water_quality.tp_limit', '0.3', 'number', '总磷标准限值(mg/L)', TRUE),
('report.auto_generate_weekly', 'true', 'boolean', '是否自动生成周报', TRUE),
('report.weekly_generation_time', '0 9 * * 1', 'string', '周报生成时间(cron表达式)', TRUE),
('approval.timeout_days_stage1', '3', 'integer', '一级审批时限(天)', TRUE),
('approval.timeout_days_stage2', '3', 'integer', '二级审批时限(天)', TRUE),
('approval.timeout_days_stage3', '5', 'integer', '三级审批时限(天)', TRUE);

-- 创建视图: 水体实时统计视图
CREATE VIEW v_water_body_realtime_stats AS
SELECT
    wb.water_body_id,
    wb.water_body_code,
    wb.water_body_name,
    wb.region_id,
    r.region_name,
    wb.water_body_level,
    wb.governance_stage,
    wb.current_status,
    -- 水质达标率
    (SELECT COALESCE(AVG(CASE WHEN wqd.is_compliant THEN 100 ELSE 0 END), 0)
     FROM sewage_outlets so
     JOIN water_quality_data wqd ON so.outlet_id = wqd.outlet_id
     WHERE so.water_body_id = wb.water_body_id
       AND wqd.monitor_time >= CURRENT_DATE - INTERVAL '7 days'
       AND wqd.data_quality = 1) AS water_quality_compliance_rate,
    -- 治理完成率
    (SELECT COALESCE(AVG(gp.actual_progress), 0)
     FROM governance_projects gp
     WHERE gp.water_body_id = wb.water_body_id) AS governance_completion_rate,
    -- 公众满意度
    (SELECT COALESCE(AVG(co.satisfaction_score) * 20, 0)
     FROM complaint_orders co
     WHERE co.water_body_id = wb.water_body_id
       AND co.satisfaction_score IS NOT NULL
       AND co.complaint_time >= CURRENT_DATE - INTERVAL '30 days') AS public_satisfaction,
    -- 排污口异常指数
    (SELECT COALESCE(
        SUM(CASE WHEN wqd.is_nh3n_overproof OR wqd.is_tp_overproof THEN 1 ELSE 0 END)::numeric /
        NULLIF(COUNT(*), 0) * 100, 0)
     FROM sewage_outlets so
     JOIN water_quality_data wqd ON so.outlet_id = wqd.outlet_id
     WHERE so.water_body_id = wb.water_body_id
       AND wqd.monitor_time >= CURRENT_DATE - INTERVAL '3 days'
       AND wqd.data_quality = 1) AS outlet_abnormality_index,
    -- 活跃排污口数量
    (SELECT COUNT(*) FROM sewage_outlets so WHERE so.water_body_id = wb.water_body_id AND so.is_active) AS active_outlet_count,
    -- 近7天监测次数
    (SELECT COUNT(*)
     FROM sewage_outlets so
     JOIN water_quality_data wqd ON so.outlet_id = wqd.outlet_id
     WHERE so.water_body_id = wb.water_body_id
       AND wqd.monitor_time >= CURRENT_DATE - INTERVAL '7 days') AS recent_monitor_count,
    -- 进行中的项目数
    (SELECT COUNT(*) FROM governance_projects gp WHERE gp.water_body_id = wb.water_body_id AND gp.project_status = 2) AS ongoing_project_count
FROM water_bodies wb
JOIN regions r ON wb.region_id = r.region_id
WHERE wb.is_active;

-- 创建区域统计视图
CREATE VIEW v_region_realtime_stats AS
SELECT
    r.region_id,
    r.region_code,
    r.region_name,
    r.region_level,
    r.parent_id,
    -- 水体总数
    (SELECT COUNT(*) FROM water_bodies wb WHERE wb.region_id = r.region_id AND wb.is_active) AS total_water_bodies,
    -- 已消除黑臭水体数
    (SELECT COUNT(*) FROM water_bodies wb WHERE wb.region_id = r.region_id AND wb.current_status IN (3, 4) AND wb.is_active) AS eliminated_water_bodies,
    -- 水质达标率
    (SELECT COALESCE(AVG(CASE WHEN wqd.is_compliant THEN 100 ELSE 0 END), 0)
     FROM water_bodies wb
     JOIN sewage_outlets so ON wb.water_body_id = so.water_body_id
     JOIN water_quality_data wqd ON so.outlet_id = wqd.outlet_id
     WHERE wb.region_id = r.region_id
       AND wqd.monitor_time >= CURRENT_DATE - INTERVAL '7 days'
       AND wqd.data_quality = 1) AS water_quality_compliance_rate,
    -- 治理完成率
    (SELECT COALESCE(AVG(gp.actual_progress), 0)
     FROM water_bodies wb
     JOIN governance_projects gp ON wb.water_body_id = gp.water_body_id
     WHERE wb.region_id = r.region_id) AS governance_completion_rate,
    -- 公众满意度
    (SELECT COALESCE(AVG(co.satisfaction_score) * 20, 0)
     FROM complaint_orders co
     WHERE co.region_id = r.region_id
       AND co.satisfaction_score IS NOT NULL
       AND co.complaint_time >= CURRENT_DATE - INTERVAL '30 days') AS public_satisfaction,
    -- 活跃预警数
    (SELECT COUNT(*) FROM alerts a
     WHERE a.region_id = r.region_id
       AND a.alert_status IN (1, 2)) AS active_alert_count,
    -- 今日新增投诉
    (SELECT COUNT(*) FROM complaint_orders co
     WHERE co.region_id = r.region_id
       AND co.complaint_time >= CURRENT_DATE) AS today_complaint_count
FROM regions r
WHERE r.is_active;

-- =============================================
-- 创建触发器函数: 自动更新updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有含updated_at的表创建触发器
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_water_bodies_modtime BEFORE UPDATE ON water_bodies FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_sewage_outlets_modtime BEFORE UPDATE ON sewage_outlets FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_governance_projects_modtime BEFORE UPDATE ON governance_projects FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_alerts_modtime BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_approval_workflows_modtime BEFORE UPDATE ON approval_workflows FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_annual_tasks_modtime BEFORE UPDATE ON annual_tasks FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_system_configs_modtime BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
