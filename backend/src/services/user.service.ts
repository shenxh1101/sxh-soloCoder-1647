import { Op, FindOptions } from 'sequelize';
import { User, IUserAttributes, IUserCreationAttributes } from '../models/User';
import { Region } from '../models/Region';
import { OperationLog } from '../models/OperationLog';
import { UserLevel, UserRole } from '../models/enums';
import { hashPassword } from '../utils/encryption';
import { applyDataPermissionFilter, canManageUser, clearRegionCache } from './permission.service';

export interface IUserQuery {
  page?: number;
  pageSize?: number;
  username?: string;
  realName?: string;
  userLevel?: UserLevel;
  regionId?: number;
  role?: UserRole;
  isActive?: boolean;
}

export interface ICreateUserRequest extends Omit<IUserCreationAttributes, 'passwordHash' | 'createdBy'> {
  password: string;
}

export interface IUpdateUserRequest extends Partial<Omit<IUserAttributes, 'userId' | 'passwordHash' | 'createdAt' | 'updatedAt' | 'createdBy'>> {
  password?: string;
}

export const getUserList = async (
  query: IUserQuery,
  currentUser: IUserAttributes
): Promise<{ rows: Omit<IUserAttributes, 'passwordHash'>[]; count: number }> => {
  const { page = 1, pageSize = 10, username, realName, userLevel, regionId, role, isActive } = query;

  const where: any = {};

  if (username) {
    where.username = { [Op.like]: `%${username}%` };
  }
  if (realName) {
    where.realName = { [Op.like]: `%${realName}%` };
  }
  if (userLevel !== undefined) {
    where.userLevel = userLevel;
  }
  if (regionId !== undefined) {
    where.regionId = regionId;
  }
  if (role) {
    where.role = role;
  }
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const options: FindOptions = {
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Region,
        as: 'region',
        attributes: ['regionId', 'regionName', 'regionCode', 'regionLevel'],
      },
    ],
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser);

  const { rows, count } = await User.findAndCountAll(filteredOptions);

  const usersWithoutPassword = rows.map((user) => {
    const { passwordHash, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword as Omit<IUserAttributes, 'passwordHash'>;
  });

  return {
    rows: usersWithoutPassword,
    count,
  };
};

export const getUserById = async (
  userId: number,
  currentUser: IUserAttributes
): Promise<Omit<IUserAttributes, 'passwordHash'> | null> => {
  const options: FindOptions = {
    where: { userId },
    include: [
      {
        model: Region,
        as: 'region',
        attributes: ['regionId', 'regionName', 'regionCode', 'regionLevel'],
      },
    ],
  };

  const filteredOptions = await applyDataPermissionFilter(options, currentUser);

  const user = await User.findOne(filteredOptions);
  if (!user) {
    return null;
  }

  const { passwordHash, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword as Omit<IUserAttributes, 'passwordHash'>;
};

export const createUser = async (
  userData: ICreateUserRequest,
  currentUser: IUserAttributes
): Promise<Omit<IUserAttributes, 'passwordHash'>> => {
  const region = await Region.findByPk(userData.regionId);
  if (!region) {
    throw new Error('区域不存在');
  }

  if (!canManageUser(currentUser, { ...userData, userId: 0, passwordHash: '' } as unknown as IUserAttributes)) {
    throw new Error('无权限创建该级别的用户');
  }

  if (userData.userLevel <= currentUser.userLevel && userData.regionId !== currentUser.regionId) {
    if (currentUser.userLevel !== UserLevel.NATIONAL) {
      throw new Error('只能在所属区域内创建用户');
    }
  }

  const existingUser = await User.findOne({ where: { username: userData.username } });
  if (existingUser) {
    throw new Error('用户名已存在');
  }

  const passwordHash = await hashPassword(userData.password);

  const createdUser = await User.create({
    ...userData,
    passwordHash,
    createdBy: currentUser.userId,
  });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'create_user',
    'user',
    `创建用户: ${userData.username}`,
    { username: userData.username, realName: userData.realName }
  );

  await clearRegionCache(createdUser.userId);

  const { passwordHash: _, ...userWithoutPassword } = createdUser.toJSON();
  return userWithoutPassword as Omit<IUserAttributes, 'passwordHash'>;
};

export const updateUser = async (
  userId: number,
  userData: IUpdateUserRequest,
  currentUser: IUserAttributes
): Promise<Omit<IUserAttributes, 'passwordHash'> | null> => {
  const user = await User.findByPk(userId);
  if (!user) {
    return null;
  }

  if (!canManageUser(currentUser, user)) {
    throw new Error('无权限修改该用户');
  }

  if (userData.regionId !== undefined && userData.regionId !== user.regionId) {
    const region = await Region.findByPk(userData.regionId);
    if (!region) {
      throw new Error('区域不存在');
    }
    if (currentUser.userLevel !== UserLevel.NATIONAL && region.regionLevel <= currentUser.userLevel) {
      throw new Error('无权限将用户移动到该区域');
    }
  }

  if (userData.username && userData.username !== user.username) {
    const existingUser = await User.findOne({ where: { username: userData.username } });
    if (existingUser) {
      throw new Error('用户名已存在');
    }
  }

  const updateData: any = { ...userData };

  if (userData.password) {
    updateData.passwordHash = await hashPassword(userData.password);
    updateData.passwordChangedAt = new Date();
    delete updateData.password;
  }

  await User.update(updateData, { where: { userId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'update_user',
    'user',
    `更新用户: ${user.username}`,
    { userId, ...updateData }
  );

  await clearRegionCache(userId);

  const updatedUser = await User.findByPk(userId);
  if (!updatedUser) {
    return null;
  }

  const { passwordHash, ...userWithoutPassword } = updatedUser.toJSON();
  return userWithoutPassword as Omit<IUserAttributes, 'passwordHash'>;
};

export const deleteUser = async (
  userId: number,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const user = await User.findByPk(userId);
  if (!user) {
    return false;
  }

  if (!canManageUser(currentUser, user)) {
    throw new Error('无权限删除该用户');
  }

  if (userId === currentUser.userId) {
    throw new Error('不能删除自己');
  }

  await User.destroy({ where: { userId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'delete_user',
    'user',
    `删除用户: ${user.username}`,
    { userId, username: user.username }
  );

  await clearRegionCache(userId);

  return true;
};

export const toggleUserStatus = async (
  userId: number,
  isActive: boolean,
  currentUser: IUserAttributes
): Promise<Omit<IUserAttributes, 'passwordHash'> | null> => {
  const user = await User.findByPk(userId);
  if (!user) {
    return null;
  }

  if (!canManageUser(currentUser, user)) {
    throw new Error('无权限修改该用户状态');
  }

  if (userId === currentUser.userId) {
    throw new Error('不能禁用自己');
  }

  await User.update({ isActive }, { where: { userId } });

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    isActive ? 'enable_user' : 'disable_user',
    'user',
    `${isActive ? '启用' : '禁用'}用户: ${user.username}`,
    { userId, isActive }
  );

  await clearRegionCache(userId);

  const updatedUser = await User.findByPk(userId);
  if (!updatedUser) {
    return null;
  }

  const { passwordHash, ...userWithoutPassword } = updatedUser.toJSON();
  return userWithoutPassword as Omit<IUserAttributes, 'passwordHash'>;
};

export const resetPassword = async (
  userId: number,
  newPassword: string,
  currentUser: IUserAttributes
): Promise<boolean> => {
  const user = await User.findByPk(userId);
  if (!user) {
    return false;
  }

  if (!canManageUser(currentUser, user)) {
    throw new Error('无权限重置该用户密码');
  }

  const passwordHash = await hashPassword(newPassword);

  await User.update(
    {
      passwordHash,
      passwordChangedAt: new Date(),
    },
    { where: { userId } }
  );

  await recordOperationLog(
    currentUser.userId,
    currentUser.username,
    'reset_password',
    'user',
    `重置用户密码: ${user.username}`,
    { userId }
  );

  await clearRegionCache(userId);

  return true;
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
  getUserList,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetPassword,
};
