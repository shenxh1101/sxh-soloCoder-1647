import cron from 'node-cron';
import { calculateAndSaveStats } from '../services/realtimeStats.service';
import { detectAndCreateAlerts } from '../services/alert.service';
import { checkApprovalTimeout } from '../services/approval.service';
import { generateAllRegionsWeeklyReport } from '../services/report.service';
import { checkFundAbnormalAndPush } from '../services/task.service';
import { getConfigValue, initDefaultConfigs, clearConfigCache } from '../services/systemConfig.service';
import { WaterQualityData } from '../models/WaterQualityData';
import { ComplaintOrder } from '../models/ComplaintOrder';
import { Op } from 'sequelize';

export const startHourlyStatsJob = (): cron.ScheduledTask => {
  return cron.schedule('0 * * * *', async () => {
    console.log(`[Cron] Starting hourly stats calculation at ${new Date().toISOString()}`);
    try {
      await calculateAndSaveStats();
      console.log(`[Cron] Hourly stats calculation completed successfully`);
    } catch (error) {
      console.error(`[Cron] Hourly stats calculation failed:`, error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Shanghai',
  });
};

export const startHourlyAlertJob = (): cron.ScheduledTask => {
  return cron.schedule('30 * * * *', async () => {
    console.log(`[Cron] Starting hourly alert detection at ${new Date().toISOString()}`);
    try {
      const alerts = await detectAndCreateAlerts();
      console.log(`[Cron] Hourly alert detection completed, created ${alerts.length} alerts`);
    } catch (error) {
      console.error(`[Cron] Hourly alert detection failed:`, error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Shanghai',
  });
};

export const startDailyApprovalTimeoutJob = (): cron.ScheduledTask => {
  return cron.schedule('0 9 * * *', async () => {
    console.log(`[Cron] Starting daily approval timeout check at ${new Date().toISOString()}`);
    try {
      const result = await checkApprovalTimeout();
      console.log(`[Cron] Daily approval timeout check completed, ${result.remindedCount} reminders sent, ${result.overdueCount} overdue workflows`);
    } catch (error) {
      console.error(`[Cron] Daily approval timeout check failed:`, error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Shanghai',
  });
};

export const startWeeklyReportJob = (): cron.ScheduledTask => {
  return cron.schedule('0 9 * * 1', async () => {
    console.log(`[Cron] Starting weekly report generation at ${new Date().toISOString()}`);
    try {
      const autoGenerate = await getConfigValue('report:auto_generate', true);
      if (!autoGenerate) {
        console.log(`[Cron] Weekly report auto-generation is disabled, skipping`);
        return;
      }
      const reports = await generateAllRegionsWeeklyReport();
      console.log(`[Cron] Weekly report generation completed, generated ${reports.length} reports`);
    } catch (error) {
      console.error(`[Cron] Weekly report generation failed:`, error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Shanghai',
  });
};

export const startDailyFundCheckJob = (): cron.ScheduledTask => {
  return cron.schedule('0 10 * * *', async () => {
    console.log(`[Cron] Starting daily fund abnormal check at ${new Date().toISOString()}`);
    try {
      const result = await checkFundAbnormalAndPush();
      console.log(`[Cron] Daily fund abnormal check completed, ${result.abnormalCount} abnormal tasks detected, ${result.pushedCount} messages pushed`);
    } catch (error) {
      console.error(`[Cron] Daily fund abnormal check failed:`, error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Shanghai',
  });
};

export const startDailyDataCleanupJob = (): cron.ScheduledTask => {
  return cron.schedule('0 2 * * *', async () => {
    console.log(`[Cron] Starting daily data cleanup at ${new Date().toISOString()}`);
    try {
      const retentionDays = await getConfigValue<number>('data:retention_days', 180);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (retentionDays ?? 180));

      const deletedWaterQuality = await WaterQualityData.destroy({
        where: {
          monitorTime: { [Op.lt]: cutoffDate },
        },
      });

      const deletedComplaints = 0;

      console.log(`[Cron] Daily data cleanup completed, deleted ${deletedWaterQuality} water quality records, ${deletedComplaints} complaint records`);
    } catch (error) {
      console.error(`[Cron] Daily data cleanup failed:`, error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Shanghai',
  });
};

export const startDailyCacheRefreshJob = (): cron.ScheduledTask => {
  return cron.schedule('0 3 * * *', async () => {
    console.log(`[Cron] Starting daily cache refresh at ${new Date().toISOString()}`);
    try {
      await clearConfigCache();
      console.log(`[Cron] Daily cache refresh completed`);
    } catch (error) {
      console.error(`[Cron] Daily cache refresh failed:`, error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Shanghai',
  });
};

export interface IJobInfo {
  name: string;
  schedule: string;
  description: string;
  nextRun: Date | null;
  isRunning: boolean;
}

export class JobScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  async init(): Promise<void> {
    console.log('[JobScheduler] Initializing job scheduler...');

    await initDefaultConfigs();

    this.jobs.set('hourly-stats', startHourlyStatsJob());
    this.jobs.set('hourly-alert', startHourlyAlertJob());
    this.jobs.set('daily-approval-timeout', startDailyApprovalTimeoutJob());
    this.jobs.set('weekly-report', startWeeklyReportJob());
    this.jobs.set('daily-fund-check', startDailyFundCheckJob());
    this.jobs.set('daily-data-cleanup', startDailyDataCleanupJob());
    this.jobs.set('daily-cache-refresh', startDailyCacheRefreshJob());

    this.startAll();

    console.log('[JobScheduler] Job scheduler initialized successfully');
  }

  startAll(): void {
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`[JobScheduler] Job '${name}' started`);
    });
  }

  stopAll(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`[JobScheduler] Job '${name}' stopped`);
    });
  }

  startJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      console.log(`[JobScheduler] Job '${name}' started manually`);
      return true;
    }
    return false;
  }

  stopJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      console.log(`[JobScheduler] Job '${name}' stopped manually`);
      return true;
    }
    return false;
  }

  getJobList(): IJobInfo[] {
    const jobDefinitions = [
      { name: 'hourly-stats', schedule: '0 * * * *', description: '每小时实时统计计算' },
      { name: 'hourly-alert', schedule: '30 * * * *', description: '每小时预警检测' },
      { name: 'daily-approval-timeout', schedule: '0 9 * * *', description: '每天审批超时提醒' },
      { name: 'weekly-report', schedule: '0 9 * * 1', description: '每周一9点生成周报' },
      { name: 'daily-fund-check', schedule: '0 10 * * *', description: '每天资金异常检测' },
      { name: 'daily-data-cleanup', schedule: '0 2 * * *', description: '每天数据清理' },
      { name: 'daily-cache-refresh', schedule: '0 3 * * *', description: '每天缓存刷新' },
    ];

    return jobDefinitions.map(def => {
      const job = this.jobs.get(def.name);
      const isRunning = job ? true : false;
      return {
        ...def,
        nextRun: null,
        isRunning,
      };
    });
  }

  async runJobManually(name: string): Promise<boolean> {
    switch (name) {
      case 'hourly-stats':
        await calculateAndSaveStats();
        return true;
      case 'hourly-alert':
        await detectAndCreateAlerts();
        return true;
      case 'daily-approval-timeout':
        await checkApprovalTimeout();
        return true;
      case 'weekly-report':
        await generateAllRegionsWeeklyReport();
        return true;
      case 'daily-fund-check':
        await checkFundAbnormalAndPush();
        return true;
      default:
        return false;
    }
  }
}

export const jobScheduler = new JobScheduler();

export const initJobs = async (): Promise<void> => {
  await jobScheduler.init();
};

export default {
  initJobs,
  jobScheduler,
  startHourlyStatsJob,
  startHourlyAlertJob,
  startDailyApprovalTimeoutJob,
  startWeeklyReportJob,
  startDailyFundCheckJob,
  startDailyDataCleanupJob,
  startDailyCacheRefreshJob,
};
