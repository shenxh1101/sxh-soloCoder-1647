# 水环境管理系统

## 项目简介

水环境管理系统是一个集水质监测、污染治理、项目管理、生态评估于一体的综合管理平台。系统采用前后端分离架构，支持国家级、省级、市级三级权限管理，实现对水体、排污口、水质监测、治理项目、投诉工单等全流程管理。

系统基于PostgreSQL + PostGIS实现空间数据存储与分析，支持地图展示、水质热力图、地理信息查询等功能。通过定时任务自动生成周报、检测预警、计算统计指标，为水环境管理提供决策支持。

---

## 功能特性清单

### 核心功能
- ✅ 用户与权限管理（三级权限、四种角色）
- ✅ 区域与水体管理（树状区域结构、水体分类）
- ✅ 排污口管理（地理定位、附近查询）
- ✅ 水质监测（数据采集、趋势分析、达标率计算）
- ✅ 治理项目管理（项目全生命周期管理）
- ✅ 进度报告（月报提交、审核流程）
- ✅ 投诉工单（受理、处理、回访、结案全流程）
- ✅ 生态评估（定期评估、历史对比）
- ✅ 统计分析（多维度数据统计、图表展示）
- ✅ 预警管理（自动检测、分级处理）
- ✅ 审批流程（三级审批、超时提醒）
- ✅ 任务与资金（年度任务、资金拨付追踪）
- ✅ 报告管理（周报自动生成、导出）
- ✅ 系统配置（参数配置、定时任务管理）

### 技术特性
- ✅ RESTful API 设计规范
- ✅ JWT Token 双令牌认证
- ✅ Sequelize ORM 数据模型
- ✅ Joi 参数验证
- ✅ Redis 缓存与会话
- ✅ PostGIS 空间数据处理
- ✅ 定时任务调度
- ✅ Excel 导入导出
- ✅ 统一响应格式
- ✅ 全局错误处理
- ✅ 操作日志记录

---

## 技术架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              前端 (Frontend)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  React 18   │  │  TypeScript │  │   Vite 5    │  │  Ant Design │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │  Zustand    │  │  React Router│ │  ECharts    │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             反向代理 (Nginx)                            │
│                        负载均衡 / HTTPS / 静态资源                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             后端 (Backend)                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                           Express 框架                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │  路由层  │  │  中间件  │  │  服务层  │  │  模型层  │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  JWT 认证   │  │  Joi 验证   │  │  Multer上传 │  │  Cron定时   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
            │                           │                           │
            │                           │                           │
            ▼                           ▼                           ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│    PostgreSQL 16     │  │       Redis 7        │  │     文件存储         │
│    + PostGIS 3.4     │  │    缓存/会话/队列    │  │    上传文件/报告     │
│   空间数据/业务数据   │  │                      │  │                      │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

---

## 快速开始

### 1. 环境准备

确保已安装以下软件：
- Node.js >= 18.x
- PostgreSQL >= 14.x + PostGIS >= 3.2
- Redis >= 6.x

### 2. 克隆项目

```bash
git clone <repository-url>
cd water-management-system
```

### 3. 后端启动

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库、Redis等信息

# 类型检查
npm run typecheck

# 构建
npm run build

# 数据库初始化（创建表和种子数据）
npm run seed

# 启动开发服务
npm run dev
```

后端服务将运行在 `http://localhost:3000`

### 4. 前端启动

```bash
# 进入前端目录
cd ../frontend

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

前端服务将运行在 `http://localhost:5173`

### 5. 健康检查

```bash
# 检查后端健康状态
curl http://localhost:3000/health
```

---

## 目录结构说明

### 后端目录结构

```
backend/
├── src/
│   ├── config/              # 配置文件
│   │   ├── database.ts      # 数据库配置
│   │   ├── redis.ts         # Redis配置
│   │   ├── jwt.ts           # JWT配置
│   │   └── index.ts         # 配置导出
│   ├── middleware/          # 中间件
│   │   ├── auth.ts          # 认证中间件
│   │   ├── permissions.ts   # 权限中间件
│   │   ├── validation.ts    # 参数验证
│   │   ├── errorHandler.ts  # 错误处理
│   │   └── requestLogger.ts # 请求日志
│   ├── models/              # 数据模型
│   │   ├── enums.ts         # 枚举定义
│   │   ├── User.ts          # 用户模型
│   │   ├── WaterBody.ts     # 水体模型
│   │   └── ...              # 其他20+模型
│   ├── routes/              # 路由定义
│   │   ├── auth.routes.ts   # 认证路由
│   │   ├── user.routes.ts   # 用户路由
│   │   └── ...              # 其他16个路由文件
│   ├── services/            # 业务逻辑层
│   │   ├── auth.service.ts  # 认证服务
│   │   └── ...              # 其他18个服务文件
│   ├── jobs/                # 定时任务
│   │   └── index.ts         # 任务调度
│   ├── seeds/               # 种子数据
│   │   └── initData.ts      # 初始化数据
│   ├── utils/               # 工具函数
│   │   ├── response.ts      # 响应工具
│   │   └── encryption.ts    # 加密工具
│   ├── types/               # 类型定义
│   └── app.ts               # 应用入口
├── dist/                    # 编译输出
├── uploads/                 # 文件上传目录
├── logs/                    # 日志目录
├── .env                     # 环境变量
├── .env.example             # 环境变量示例
├── package.json             # 项目配置
└── tsconfig.json            # TypeScript配置
```

### 前端目录结构

```
frontend/
├── src/
│   ├── api/                 # API接口封装
│   │   ├── auth.ts          # 认证接口
│   │   └── ...              # 其他接口
│   ├── pages/               # 页面组件
│   │   ├── Login/           # 登录页
│   │   ├── Dashboard/       # 仪表盘
│   │   ├── WaterBody/       # 水体管理
│   │   └── ...              # 其他页面
│   ├── components/          # 公共组件
│   │   └── PermissionButton/ # 权限按钮
│   ├── layouts/             # 布局组件
│   │   └── BasicLayout.tsx  # 基础布局
│   ├── router/              # 路由配置
│   │   ├── index.tsx        # 路由定义
│   │   └── guards.tsx       # 路由守卫
│   ├── store/               # 状态管理
│   │   ├── index.ts         # Store入口
│   │   └── userStore.ts     # 用户状态
│   ├── styles/              # 全局样式
│   ├── types/               # TypeScript类型
│   ├── utils/               # 工具函数
│   │   ├── request.ts       # 请求封装
│   │   └── auth.ts          # 认证工具
│   ├── App.tsx              # 根组件
│   └── main.tsx             # 入口文件
├── .env.development         # 开发环境变量
├── .env.production          # 生产环境变量
├── index.html               # HTML模板
└── vite.config.ts           # Vite配置
```

---

## 主要功能模块说明

### 1. 用户与权限模块

**三级权限体系**:
- **国家级**: 可查看所有区域数据，配置系统参数
- **省级**: 可查看本省及下属市级数据，审批省级项目
- **市级**: 仅可查看本市数据，处理日常业务

**四种角色**:
- **管理员 (admin)**: 拥有所有权限
- **审批员 (approver)**: 负责审批流程
- **审核员 (auditor)**: 负责数据审核
- **查看员 (viewer)**: 仅可查看数据

### 2. 水体与排污口管理

- 支持河流、湖泊、水库等多种水体类型
- 基于PostGIS实现地理空间数据存储
- 支持按距离查询附近排污口
- 水体治理阶段跟踪（排查、方案、治理、验收）

### 3. 水质监测模块

- 支持pH、DO、COD、NH3-N等多项指标监测
- 自动计算水质类别（Ⅰ~Ⅴ类、劣Ⅴ类）
- 趋势分析（日/周/月/季/年）
- 达标率自动统计
- 支持Excel批量导入监测数据

### 4. 治理项目管理

- 项目全生命周期管理（储备、在建、完工、验收）
- 项目进度跟踪与月报提交
- 资金使用情况管理
- 项目统计分析

### 5. 预警与审批

- 自动检测水质超标、项目超期等异常
- 预警分级（一般/较大/重大/特别重大）
- 三级审批流程（市级→省级→国家级）
- 审批超时自动提醒

### 6. 统计分析

- 水质达标率计算
- 治理完成率统计
- 公众满意度分析
- 排污口异常指数
- 多维度数据可视化

---

## 默认账号密码

系统初始化后包含以下测试账号：

| 账号 | 密码 | 级别 | 角色 | 说明 |
|------|------|------|------|------|
| `admin_national` | `123456` | 国家级 | 管理员 | 系统超级管理员 |
| `admin_province` | `123456` | 省级 | 管理员 | 省级管理员 |
| `admin_city` | `123456` | 市级 | 管理员 | 市级管理员 |
| `approver` | `123456` | 省级 | 审批员 | 审批员账号 |
| `auditor` | `123456` | 市级 | 审核员 | 审核员账号 |
| `viewer` | `123456` | 市级 | 查看员 | 只读账号 |

> **注意**: 生产环境请务必修改默认密码！

---

## 开发规范

### 代码规范

1. **命名规范**:
   - 文件名: 小写+连字符（如 `user.routes.ts`）
   - 类名/接口: 大驼峰（如 `UserService`）
   - 函数/变量: 小驼峰（如 `getUserList`）
   - 常量: 全大写+下划线（如 `MAX_FILE_SIZE`）

2. **TypeScript规范**:
   - 禁止使用 `any` 类型
   - 所有函数必须定义返回类型
   - 接口优先使用 `interface` 而非 `type`

3. **API规范**:
   - 统一使用RESTful风格
   - 统一响应格式: `{ code, message, data, timestamp }`
   - 分页格式: `{ list, page, pageSize, total, totalPages }`
   - 错误码规范: 200成功, 400参数错误, 401未认证, 403无权限, 404不存在, 500服务器错误

### Git提交规范

```
<type>(<scope>): <subject>

type:
  feat:     新功能
  fix:      修复bug
  docs:     文档变更
  style:    代码格式
  refactor: 重构
  perf:     性能优化
  test:     测试相关
  chore:    构建/工具等

示例:
  feat(user): 添加用户重置密码功能
  fix(water-quality): 修复水质数据导入异常
  docs(api): 更新API文档
```

---

## 相关文档

- [API接口文档](./docs/API_DOCUMENTATION.md) - 完整的API接口说明
- [部署指南](./docs/DEPLOYMENT_GUIDE.md) - 详细的部署说明

---

## 许可证

MIT License

Copyright (c) 2024 水环境管理系统

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
