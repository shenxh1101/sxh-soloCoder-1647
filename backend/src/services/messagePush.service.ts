import { Op, FindOptions } from 'sequelize';
import {
  MessagePushLog,
  User,
  Region,
  Alert,
  ApprovalWorkflow,
} from '../models';
import { IMessagePushLogAttributes, IMessagePushLogCreationAttributes } from '../models/MessagePushLog';
import {
  MessageType,
  ReceiverType,
  PushChannel,
  PushStatus,
  UserRole,
  AlertLevel,
} from '../models/enums';
import { redis } from '../config';

export interface IPushRequest {
  messageType: MessageType;
  title: string;
  content: string;
  channels: PushChannel[];
  receiverType: ReceiverType;
  receiverIds: number[];
  relatedId?: number;
}

export interface IPushQuery {
  page?: number;
  pageSize?: number;
  messageType?: MessageType;
  pushStatus?: PushStatus;
  receiverId?: number;
  startDate?: string;
  endDate?: string;
}

const CACHE_PREFIX = 'message_push:';
const CACHE_TTL = 1800;

export const getTargetUsers = async (
  receiverType: ReceiverType,
  receiverIds: number[],
  regionId?: number
): Promise<User[]> => {
  const where: any = { isActive: true };

  switch (receiverType) {
    case ReceiverType.USER:
      where.userId = { [Op.in]: receiverIds };
      break;
    case ReceiverType.DEPARTMENT:
      where.department = { [Op.in]: receiverIds.map((id) => String(id)) };
      break;
    case ReceiverType.ROLE:
      where.role = { [Op.in]: receiverIds.map((id) => id as unknown as UserRole) };
      break;
  }

  if (regionId) {
    where.regionId = regionId;
  }

  const users = await User.findAll({
    where,
    attributes: ['userId', 'username', 'realName', 'phone', 'email', 'department', 'role', 'regionId'],
    include: [{ model: Region, as: 'region', attributes: ['regionId', 'regionName'] }],
  });

  return users;
};

export const getAlertTargetUsers = async (alert: Alert): Promise<User[]> => {
  const users: User[] = [];

  if (alert.alertLevel === AlertLevel.LEVEL_1) {
    const adminUsers = await User.findAll({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    users.push(...adminUsers);
  }

  if (alert.regionId) {
    const regionUsers = await User.findAll({
      where: {
        regionId: alert.regionId,
        role: { [Op.in]: [UserRole.ADMIN, UserRole.APPROVER, UserRole.AUDITOR] },
        isActive: true,
      },
    });
    users.push(...regionUsers);
  }

  const uniqueUsers = Array.from(new Map(users.map((u) => [u.userId, u])).values());
  return uniqueUsers;
};

export const getApprovalTargetUsers = async (
  workflow: ApprovalWorkflow,
  currentStage: number
): Promise<User[]> => {
  const handlerField = `stage${currentStage}Handler` as keyof ApprovalWorkflow;
  const handlerId = workflow[handlerField] as number | undefined;

  if (handlerId) {
    const handler = await User.findByPk(handlerId);
    if (handler) {
      return [handler];
    }
  }

  const where: any = {
    regionId: workflow.regionId,
    role: { [Op.in]: [UserRole.APPROVER, UserRole.ADMIN] },
    isActive: true,
  };

  return await User.findAll({ where });
};

const sendSms = async (phone: string, content: string): Promise<boolean> => {
  console.log(`[SMS] Sending to ${phone}: ${content}`);
  return true;
};

const sendEmail = async (email: string, title: string, content: string): Promise<boolean> => {
  console.log(`[Email] Sending to ${email}: ${title}`);
  return true;
};

const sendAppPush = async (userId: number, title: string, content: string): Promise<boolean> => {
  console.log(`[APP Push] Sending to user ${userId}: ${title}`);
  return true;
};

const sendWechat = async (userId: number, content: string): Promise<boolean> => {
  console.log(`[WeChat] Sending to user ${userId}: ${content}`);
  return true;
};

const sendByChannel = async (
  channel: PushChannel,
  user: User,
  title: string,
  content: string
): Promise<boolean> => {
  try {
    switch (channel) {
      case PushChannel.SMS:
        if (user.phone) {
          return await sendSms(user.phone, content);
        }
        return false;
      case PushChannel.EMAIL:
        if (user.email) {
          return await sendEmail(user.email, title, content);
        }
        return false;
      case PushChannel.APP:
        return await sendAppPush(user.userId, title, content);
      case PushChannel.WECHAT:
        return await sendWechat(user.userId, content);
      default:
        return false;
    }
  } catch (err) {
    console.error('Send by channel error:', err);
    return false;
  }
};

export const pushMessage = async (request: IPushRequest): Promise<MessagePushLog> => {
  const {
    messageType,
    title,
    content,
    channels,
    receiverType,
    receiverIds,
    relatedId,
  } = request;

  const logData: IMessagePushLogCreationAttributes = {
    messageType,
    title,
    content,
    receiverType,
    receiverIds,
    pushChannels: channels.map(c => c.toString()),
    pushStatus: PushStatus.PUSHING,
    relatedId,
  };

  const log = await MessagePushLog.create(logData);

  const targetUsers = await getTargetUsers(receiverType, receiverIds);
  let allSuccess = true;

  for (const user of targetUsers) {
    for (const channel of channels) {
      const success = await sendByChannel(channel, user, title, content);
      if (!success) {
        allSuccess = false;
      }
    }
  }

  await log.update({
    pushStatus: allSuccess ? PushStatus.PUSHED : PushStatus.PUSH_FAILED,
    pushTime: new Date(),
  });

  await clearPushCache();

  return log;
};

export const pushAlertMessage = async (alert: Alert): Promise<MessagePushLog> => {
  const targetUsers = await getAlertTargetUsers(alert);

  const levelText = alert.alertLevel === AlertLevel.LEVEL_1 ? '【紧急】' : alert.alertLevel === AlertLevel.LEVEL_2 ? '【重要】' : '【普通】';
  const title = `${levelText}${alert.alertContent.slice(0, 50)}...`;
  const channels = [PushChannel.APP, PushChannel.SMS];

  const logData: IMessagePushLogCreationAttributes = {
    messageType: MessageType.ALERT,
    title,
    content: alert.alertContent,
    receiverType: ReceiverType.USER,
    receiverIds: targetUsers.map(u => u.userId),
    pushChannels: channels.map(c => c.toString()),
    pushStatus: PushStatus.PUSHING,
    relatedId: alert.alertId,
  };

  const log = await MessagePushLog.create(logData);

  let allSuccess = true;
  for (const user of targetUsers) {
    for (const channel of channels) {
      const success = await sendByChannel(channel, user, title, alert.alertContent);
      if (!success) {
        allSuccess = false;
      }
    }
  }

  await log.update({
    pushStatus: allSuccess ? PushStatus.PUSHED : PushStatus.PUSH_FAILED,
    pushTime: new Date(),
  });

  if (allSuccess) {
    await Alert.update(
      { pushStatus: PushStatus.PUSHED, pushTime: new Date(), pushTargets: { userIds: targetUsers.map((u) => u.userId) } },
      { where: { alertId: alert.alertId } }
    );
  }

  await clearPushCache();

  return log;
};

export const pushApprovalMessage = async (
  workflow: ApprovalWorkflow,
  currentStage: number
): Promise<MessagePushLog> => {
  const targetUsers = await getApprovalTargetUsers(workflow, currentStage);

  const stageText = currentStage === 1 ? '一级' : currentStage === 2 ? '二级' : '三级';
  const title = `【审批提醒】${stageText}审批待处理`;
  const content = `您有一条${stageText}审批待处理：${(workflow as any).applicationContent ? (workflow as any).applicationContent.slice(0, 100) : ''}...`;
  const channels = [PushChannel.APP, PushChannel.SMS];

  const logData: IMessagePushLogCreationAttributes = {
    messageType: MessageType.APPROVAL,
    title,
    content,
    receiverType: ReceiverType.USER,
    receiverIds: targetUsers.map(u => u.userId),
    pushChannels: channels.map(c => c.toString()),
    pushStatus: PushStatus.PUSHING,
    relatedId: workflow.workflowId,
  };

  const log = await MessagePushLog.create(logData);

  let allSuccess = true;
  for (const user of targetUsers) {
    for (const channel of channels) {
      const success = await sendByChannel(channel, user, title, content);
      if (!success) {
        allSuccess = false;
      }
    }
  }

  await log.update({
    pushStatus: allSuccess ? PushStatus.PUSHED : PushStatus.PUSH_FAILED,
    pushTime: new Date(),
  });

  await clearPushCache();

  return log;
};

export const markAsRead = async (logId: number, userId: number): Promise<boolean> => {
  const log = await MessagePushLog.findByPk(logId);
  if (!log) {
    return false;
  }

  const receiverIds = log.receiverIds || [];
  if (!receiverIds.includes(userId)) {
    return false;
  }

  const readStatus = log.readStatus || {};
  (readStatus as any)[userId] = { read: true, readTime: new Date() };

  await log.update({ readStatus });

  await clearPushCache();

  return true;
};

export const getPushLogList = async (
  query: IPushQuery,
  currentUserId?: number
): Promise<{ rows: IMessagePushLogAttributes[]; count: number }> => {
  const {
    page = 1,
    pageSize = 10,
    messageType,
    pushStatus,
    receiverId,
    startDate,
    endDate,
  } = query;

  const where: any = {};

  if (messageType !== undefined) where.messageType = messageType;
  if (pushStatus !== undefined) where.pushStatus = pushStatus;
  if (receiverId !== undefined) {
    where.receiverIds = { [Op.contains]: [receiverId] };
  }
  if (currentUserId !== undefined) {
    where.receiverIds = { [Op.contains]: [currentUserId] };
  }
  if (startDate && endDate) {
    where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['createdAt', 'DESC']],
  };

  const cacheKey = `${CACHE_PREFIX}list:${JSON.stringify(query)}:${currentUserId || ''}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }

  const { rows, count } = await MessagePushLog.findAndCountAll(options);

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ rows, count }));
  } catch (err) {
    console.error('Cache write error:', err);
  }

  return { rows: rows.map((r) => r.toJSON()), count };
};

export const getUnreadCount = async (userId: number): Promise<number> => {
  const cacheKey = `${CACHE_PREFIX}unread:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }

  const logs = await MessagePushLog.findAll({
    where: {
      pushStatus: PushStatus.PUSHED,
    },
    attributes: ['pushId', 'receiverIds', 'readStatus'],
  });

  let count = 0;
  for (const log of logs) {
    const receiverIds = log.receiverIds || [];
    if (receiverIds.includes(userId)) {
      const readStatus = log.readStatus || {};
      if (!(readStatus as any)[userId] || !(readStatus as any)[userId].read) {
        count++;
      }
    }
  }

  try {
    await redis.setex(cacheKey, 300, String(count));
  } catch (err) {
    console.error('Cache write error:', err);
  }

  return count;
};

const clearPushCache = async (): Promise<void> => {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error('Cache clear error:', err);
  }
};

export default {
  getTargetUsers,
  getAlertTargetUsers,
  getApprovalTargetUsers,
  pushMessage,
  pushAlertMessage,
  pushApprovalMessage,
  markAsRead,
  getPushLogList,
  getUnreadCount,
};
