import dotenv from 'dotenv';
import { initDatabase, sequelize } from '../models';
import { seedAllData } from './initData';

dotenv.config();

const runSeeds = async (): Promise<void> => {
  try {
    console.log('='.repeat(60));
    console.log('水环境管理系统 - 数据初始化脚本');
    console.log('='.repeat(60));
    console.log();

    console.log('正在连接数据库...');
    await initDatabase();
    console.log('数据库连接成功！');
    console.log();

    console.log('正在同步数据库表结构...');
    await sequelize.sync({ alter: true });
    console.log('数据库表结构同步完成！');
    console.log();

    await seedAllData();

    console.log();
    console.log('='.repeat(60));
    console.log('数据初始化全部完成！');
    console.log('='.repeat(60));
    console.log();
    console.log('默认账号: admin / 123456');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('数据初始化失败:', error);
    console.error('错误详情:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
};

if (require.main === module) {
  runSeeds();
}

export default runSeeds;
