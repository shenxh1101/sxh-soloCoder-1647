import { Op, FindOptions, fn, col } from 'sequelize';
import { EcologicalAssessment, IEcologicalAssessmentAttributes, IEcologicalAssessmentCreationAttributes } from '../models/EcologicalAssessment';
import { WaterBody } from '../models/WaterBody';
import { Region } from '../models/Region';
import { User } from '../models/User';
import { OperationLog } from '../models/OperationLog';
import { IUserAttributes } from '../models/User';
import { AssessmentType, AssessmentLevel } from '../models/enums';
import { applyDataPermissionFilter } from './permission.service';

export interface IAssessmentQuery {
  page?: number;
  pageSize?: number;
  assessmentCode?: string;
  waterBodyId?: number;
  regionId?: number;
  assessmentType?: AssessmentType;
  assessmentLevel?: AssessmentLevel;
  isApproved?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface IAssessmentCompareQuery {
  waterBodyId: number;
  assessmentType?: AssessmentType;
  startTime: string;
  endTime: string;
}

const ASSESSMENT_WEIGHTS = {
  waterQuality: 0.35,
  ecological: 0.25,
  landscape: 0.2,
  management: 0.2,
};

const calculateComprehensiveScore = (data: Partial<IEcologicalAssessmentAttributes>): number => {
  let total = 0;
  let weightSum = 0;

  if (data.waterQualityScore !== undefined) {
    total += data.waterQualityScore * ASSESSMENT_WEIGHTS.waterQuality;
    weightSum += ASSESSMENT_WEIGHTS.waterQuality;
  }
  if (data.ecologicalIndex !== undefined) {
    total += data.ecologicalIndex * ASSESSMENT_WEIGHTS.ecological;
    weightSum += ASSESSMENT_WEIGHTS.ecological;
  }
  if (data.landscapeScore !== undefined) {
    total += data.landscapeScore * ASSESSMENT_WEIGHTS.landscape;
    weightSum += ASSESSMENT_WEIGHTS.landscape;
  }
  if (data.managementScore !== undefined) {
    total += data.managementScore * ASSESSMENT_WEIGHTS.management;
    weightSum += ASSESSMENT_WEIGHTS.management;
  }

  if (weightSum === 0) return 0;

  return Math.round((total / weightSum) * 100) / 100;
};

const determineAssessmentLevel = (score: number): AssessmentLevel => {
  if (score >= 90) return AssessmentLevel.EXCELLENT;
  if (score >= 75) return AssessmentLevel.GOOD;
  if (score >= 60) return AssessmentLevel.QUALIFIED;
  return AssessmentLevel.UNQUALIFIED;
};

export const getAssessmentList = async (
  query: IAssessmentQuery,
  currentUser: IUserAttributes
): Promise<{ rows: IEcologicalAssessmentAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    assessmentCode,
    waterBodyId,
    regionId,
    assessmentType,
    assessmentLevel,
    isApproved,
    startTime,
    endTime,
  } = query;

  const where: any = {};

  if (assessmentCode) {
    where.assessmentCode = { [Op.like]: `%${assessmentCode}%` };
  }
  if (waterBodyId) {
    where.waterBodyId = waterBodyId;
  }
  if (assessmentType !== undefined) {
    where.assessmentType = assessmentType;
  }
  if (assessmentLevel) {
    where.assessmentLevel = assessmentLevel;
  }
  if (isApproved !== undefined) {
    where.isApproved = isApproved;
  }
  if (startTime) {
    where.assessmentDate = { [Op.gte]: new Date(startTime) };
  }
  if (endTime) {
    where.assessmentDate = { ...where.assessmentDate, [Op.lte]: new Date(endTime) };
  }

  const include: any[] = [
    {
      model: WaterBody,
      as: 'waterBody',
      attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName'],
      include: [
        {
          model: Region,
          as: 'region',
          attributes: ['regionId', 'regionName', 'regionCode'],
        },
      ],
    },
    {
      model: User,
      as: 'assessor',
      attributes: ['userId', 'username', 'realName'],
    },
    {
      model: User,
      as: 'approver',
      attributes: ['userId', 'username', 'realName'],
    },
  ];

  if (regionId) {
    (include[0].include[0] as any).where = { regionId };
  }

  const options: FindOptions = {
    where,
    include,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['assessmentDate', 'DESC']],
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser, 'waterBody.regionId');
  const { rows, count } = await EcologicalAssessment.findAndCountAll(filteredOptions);

  return {
    rows: rows.map(r => r.toJSON()),
    count,
  };
};

export const getAssessmentById = async (
  assessmentId: number,
  currentUser: IUserAttributes
): Promise<IEcologicalAssessmentAttributes | null> => {
  const options: FindOptions = {
    where: { assessmentId },
    include: [
      {
        model: WaterBody,
        as: 'waterBody',
        attributes: ['waterBodyId', 'waterBodyCode', 'waterBodyName'],
        include: [
          {
            model: Region,
            as: 'region',
            attributes: ['regionId', 'regionName', 'regionCode'],
          },
        ],
      },
      {
        model: User,
        as: 'assessor',
        attributes: ['userId', 'username', 'realName'],
      },
      {
        model: User,
        as: 'approver',
        attributes: ['userId', 'username', 'realName'],
      },
    ],
  };

  const assessment = await EcologicalAssessment.findOne(options);
  return assessment ? assessment.toJSON() : null;
};

const generateAssessmentCode = async (assessmentType: AssessmentType): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const typeStr = String(assessmentType).padStart(2, '0');

  const lastAssessment = await EcologicalAssessment.findOne({
    where: {
      assessmentCode: {
        [Op.like]: `PG${year}${typeStr}%`,
      },
    },
    order: [['assessmentCode', 'DESC']],
  });

  let sequence = 1;
  if (lastAssessment) {
    const lastCode = lastAssessment.assessmentCode;
    const lastSequence = parseInt(lastCode.slice(-4));
    sequence = lastSequence + 1;
  }

  return `PG${year}${typeStr}${String(sequence).padStart(4, '0')}`;
};

export const createAssessment = async (
  data: IEcologicalAssessmentCreationAttributes,
  currentUser: IUserAttributes
): Promise<IEcologicalAssessmentAttributes> => {
  const waterBody = await WaterBody.findByPk(data.waterBodyId);
  if (!waterBody) {
    throw new Error('水体不存在');
  }

  if (!data.assessmentCode) {
    data.assessmentCode = await generateAssessmentCode(data.assessmentType);
  }

  const comprehensiveScore = calculateComprehensiveScore(data);
  data.comprehensiveScore = comprehensiveScore;
  data.assessmentLevel = determineAssessmentLevel(comprehensiveScore);
  data.assessorId = currentUser.userId;
  data.isApproved = false;

  const created = await EcologicalAssessment.create(data);

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_assessment',
    'assessment',
    `创建生态评估报告: ${data.assessmentCode}`,
    { assessmentId: created.assessmentId, assessmentCode: data.assessmentCode }
  );

  return created.toJSON();
};

export const updateAssessment = async (
  assessmentId: number,
  data: Partial<IEcologicalAssessmentAttributes>,
  currentUser: IUserAttributes
): Promise<IEcologicalAssessmentAttributes | null> => {
  const existing = await EcologicalAssessment.findByPk(assessmentId);
  if (!existing) {
    return null;
  }

  if (existing.isApproved) {
    throw new Error('已审核的评估报告无法修改');
  }

  if (data.waterBodyId !== undefined && data.waterBodyId !== existing.waterBodyId) {
    const waterBody = await WaterBody.findByPk(data.waterBodyId);
    if (!waterBody) {
      throw new Error('水体不存在');
    }
  }

  const combinedData = { ...existing.toJSON(), ...data };
  const comprehensiveScore = calculateComprehensiveScore(combinedData);
  data.comprehensiveScore = comprehensiveScore;
  data.assessmentLevel = determineAssessmentLevel(comprehensiveScore);

  await EcologicalAssessment.update(data, { where: { assessmentId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_assessment',
    'assessment',
    `更新生态评估报告: ${existing.assessmentCode}`,
    { assessmentId, ...data }
  );

  const updated = await EcologicalAssessment.findByPk(assessmentId);
  return updated ? updated.toJSON() : null;
};

export const deleteAssessment = async (
  assessmentId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const existing = await EcologicalAssessment.findByPk(assessmentId);
  if (!existing) {
    return false;
  }

  if (existing.isApproved) {
    throw new Error('已审核的评估报告无法删除');
  }

  await EcologicalAssessment.destroy({ where: { assessmentId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_assessment',
    'assessment',
    `删除生态评估报告: ${existing.assessmentCode}`,
    { assessmentId, assessmentCode: existing.assessmentCode }
  );

  return true;
};

export const approveAssessment = async (
  assessmentId: number,
  currentUser: IUserAttributes
): Promise<IEcologicalAssessmentAttributes | null> => {
  const existing = await EcologicalAssessment.findByPk(assessmentId);
  if (!existing) {
    return null;
  }

  if (existing.isApproved) {
    throw new Error('该评估报告已审核');
  }

  await EcologicalAssessment.update(
    {
      isApproved: true,
      approvedBy: currentUser.userId,
      approvedAt: new Date(),
    },
    { where: { assessmentId } }
  );

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'approve_assessment',
    'assessment',
    `审核通过生态评估报告: ${existing.assessmentCode}`,
    { assessmentId, assessmentCode: existing.assessmentCode }
  );

  const updated = await EcologicalAssessment.findByPk(assessmentId);
  return updated ? updated.toJSON() : null;
};

export const getAssessmentComparison = async (
  query: IAssessmentCompareQuery,
  currentUser: IUserAttributes
): Promise<any[]> => {
  const { waterBodyId, assessmentType, startTime, endTime } = query;

  const where: any = {
    waterBodyId,
    assessmentDate: {
      [Op.between]: [new Date(startTime), new Date(endTime)],
    },
    isApproved: true,
  };

  if (assessmentType !== undefined) {
    where.assessmentType = assessmentType;
  }

  const results = await EcologicalAssessment.findAll({
    where,
    attributes: [
      'assessmentId',
      'assessmentCode',
      'assessmentDate',
      'assessmentType',
      'assessmentPeriod',
      'waterQualityScore',
      'ecologicalIndex',
      'landscapeScore',
      'managementScore',
      'comprehensiveScore',
      'assessmentLevel',
      'biodiversityIndex',
      'vegetationCoverage',
      'habitatQuality',
    ],
    order: [['assessmentDate', 'ASC']],
    raw: true,
  });

  return results as any[];
};

const recordOperationLog = async (
  userId: number,
  username: string,
  operationType: string,
  moduleName: string,
  operationContent: string,
  requestParams?: object
): Promise<void> => {
  try {
    await OperationLog.create({
      userId,
      username,
      operationType,
      moduleName,
      operationContent,
      requestParams,
    });
  } catch (err) {
    console.error('Failed to record operation log:', err);
  }
};

export default {
  getAssessmentList,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  approveAssessment,
  getAssessmentComparison,
};
