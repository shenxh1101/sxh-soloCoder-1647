import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';

import { config, database, redis } from './config';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

import {
  authRoutes,
  userRoutes,
  regionRoutes,
  waterBodyRoutes,
  sewageOutletRoutes,
  waterQualityRoutes,
  projectRoutes,
  progressReportRoutes,
  complaintRoutes,
  assessmentRoutes,
  statsRoutes,
  alertRoutes,
  approvalRoutes,
  taskRoutes,
  reportRoutes,
  configRoutes,
} from './routes';
import { initJobs } from './jobs';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:']
    }
  }
}));

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json({
  limit: '10mb',
  verify: (req: Request, res: Response, buf: Buffer) => {
    (req as any).rawBody = buf;
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

const uploadDir = path.join(process.cwd(), config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const logFormat = config.nodeEnv === 'production'
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'
  : 'dev';

if (config.nodeEnv === 'production') {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const accessLogStream = fs.createWriteStream(
    path.join(logDir, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan(logFormat, { stream: accessLogStream }));
} else {
  app.use(morgan(logFormat));
}

app.use(requestLogger);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.sendSuccess = (data?: any, message: string = 'success') => {
    return res.json({
      code: 200,
      message,
      data,
      timestamp: Date.now()
    });
  };

  res.sendError = (message: string, code: number = 400) => {
    return res.status(code).json({
      code,
      message,
      timestamp: Date.now()
    });
  };

  next();
});

app.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const dbStatus = await database.authenticate()
    .then(() => 'connected')
    .catch(() => 'disconnected');

  const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';

  res.json({
    code: 200,
    message: 'OK',
    data: {
      status: 'healthy',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus
      }
    },
    timestamp: Date.now()
  });
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/water-bodies', waterBodyRoutes);
app.use('/api/sewage-outlets', sewageOutletRoutes);
app.use('/api/water-quality', waterQualityRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/progress-reports', progressReportRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/configs', configRoutes);

app.use('/api', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'API v1.0',
    data: {
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth/*',
        users: '/api/users/*',
        regions: '/api/regions/*',
        waterBodies: '/api/water-bodies/*',
        sewageOutlets: '/api/sewage-outlets/*',
        waterQuality: '/api/water-quality/*',
        projects: '/api/projects/*',
        progressReports: '/api/progress-reports/*',
        complaints: '/api/complaints/*',
        assessments: '/api/assessments/*',
        stats: '/api/stats/*',
        alerts: '/api/alerts/*',
        approvals: '/api/approvals/*',
        tasks: '/api/tasks/*',
        reports: '/api/reports/*',
        configs: '/api/configs/*',
      }
    },
    timestamp: Date.now()
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'Water Environment Management System API',
    data: {
      name: 'Water Environment Management System',
      version: '1.0.0',
      docs: '/api',
      health: '/health'
    },
    timestamp: Date.now()
  });
});

app.use(notFoundHandler);

app.use(errorHandler);

const initDatabase = async (): Promise<void> => {
  try {
    await database.authenticate();
    console.log('Database connected successfully');

    if (config.nodeEnv === 'development') {
      await database.sync({ alter: false });
      console.log('Database models synchronized');
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const initRedis = async (): Promise<void> => {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    console.log('Redis initialized successfully');
  } catch (error) {
    console.error('Redis initialization failed:', error);
  }
};

const initCronJobs = async (): Promise<void> => {
  console.log('Initializing cron jobs...');
  await initJobs();
  console.log('Cron jobs initialized successfully');
};

const startServer = async (): Promise<void> => {
  try {
    await initDatabase();
    await initRedis();
    initCronJobs();

    const server = app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   水环境管理系统 API 服务已启动                              ║
║                                                            ║
║   环境: ${config.nodeEnv.padEnd(45)}║
║   端口: ${String(config.port).padEnd(45)}║
║   地址: http://localhost:${String(config.port).padEnd(38)}║
║   健康检查: http://localhost:${String(config.port)}/health${' '.repeat(29)}║
║   API文档: http://localhost:${String(config.port)}/api${' '.repeat(32)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          console.error(`Port ${config.port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`Port ${config.port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);

      server.close(() => {
        console.log('HTTP server closed');
      });

      try {
        await database.close();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database connection:', error);
      }

      try {
        await redis.quit();
        console.log('Redis connection closed');
      } catch (error) {
        console.error('Error closing Redis connection:', error);
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;
export { startServer };
