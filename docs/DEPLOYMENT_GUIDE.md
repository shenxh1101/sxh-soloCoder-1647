# 部署指南

## 1. 环境要求

### 1.1 软件版本要求

| 软件 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| Node.js | 18.x | 20.x | LTS版本 |
| PostgreSQL | 14.x | 16.x | 需安装PostGIS扩展 |
| PostGIS | 3.2 | 3.4 | 空间数据扩展 |
| Redis | 6.x | 7.x | 缓存和会话存储 |
| Nginx | 1.18 | 1.24 | 反向代理 |

### 1.2 硬件要求

| 环境 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| 开发环境 | 2核 | 4GB | 20GB |
| 测试环境 | 4核 | 8GB | 50GB |
| 生产环境 | 8核 | 16GB | 100GB SSD |

---

## 2. 数据库初始化

### 2.1 安装PostgreSQL和PostGIS

**CentOS/RHEL:
```bash
# 安装PostgreSQL 16
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8/x86_64/pgdg-redhat-repo-latest.noarch.rpm
sudo dnf -qy module disable postgresql
sudo dnf install -y postgresql16-server postgresql16-contrib postgis34_16

# 初始化数据库
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb
sudo systemctl enable postgresql-16
sudo systemctl start postgresql-16
```

**Ubuntu/Debian:
```bash
# 安装PostgreSQL 16
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgresql-16-postgis-3

# PostGIS扩展
sudo apt install -y postgresql-16-postgis-3-scripts
```

**Docker方式:
```bash
docker run --name postgres-postgis \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=water_management \
  -p 5432:5432 \
  -d postgis/postgis:16-3.4
```

### 2.2 创建数据库和用户

```sql
-- 登录PostgreSQL
sudo -u postgres psql

-- 创建用户
CREATE USER water_user WITH PASSWORD 'water_password';

-- 创建数据库
CREATE DATABASE water_management WITH OWNER water_user;

-- 连接数据库
\c water_management

-- 启用PostGIS扩展
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- 授予权限
GRANT ALL PRIVILEGES ON SCHEMA public TO water_user;
```

### 2.3 数据库迁移

```bash
# 进入后端目录
cd backend

# 执行数据库同步
npm run build && npm run seed
```

---

## 3. 环境变量配置

### 3.1 后端环境变量 (.env)

```env
# ========================================
# 服务配置
# ========================================
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# ========================================
# 数据库配置
# ========================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=water_management
DB_USERNAME=water_user
DB_PASSWORD=water_password
DB_DIALECT=postgres

# ========================================
# Redis配置
# ========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ========================================
# JWT配置
# ========================================
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=7d

# ========================================
# 文件上传配置
# ========================================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,xlsx,xls,doc,docx

# ========================================
# 日志配置
# ========================================
LOG_LEVEL=info
LOG_DIR=./logs
```

### 3.2 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | development |
| PORT | 服务端口 | 3000 |
| DB_HOST | 数据库地址 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| DB_NAME | 数据库名 | water_management |
| DB_USERNAME | 数据库用户名 | water_user |
| DB_PASSWORD | 数据库密码 | - |
| REDIS_HOST | Redis地址 | localhost |
| REDIS_PORT | Redis端口 | 6379 |
| JWT_SECRET | JWT密钥 | - |
| JWT_EXPIRES_IN | Token有效期 | 2h |
| UPLOAD_DIR | 文件上传目录 | ./uploads |
| MAX_FILE_SIZE | 最大文件大小 | 10MB |

---

## 4. 后端部署步骤

### 4.1 源码部署

```bash
# 1. 拉取代码
git clone <repository-url>
cd water-management-system/backend

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑.env文件，配置数据库等信息

# 4. 类型检查
npm run typecheck

# 5. 构建
npm run build

# 6. 数据库初始化
npm run seed

# 7. 启动服务
# 开发环境
npm run dev

# 生产环境
npm start
```

### 4.2 PM2部署（推荐生产环境）

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start dist/app.js --name water-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs water-backend

# 重启
pm2 restart water-backend

# 停止
pm2 stop water-backend

# 开机自启
pm2 startup
pm2 save
```

### 4.3 Docker部署

创建 `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: water_management
      POSTGRES_USER: water_user
      POSTGRES_PASSWORD: water_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      REDIS_HOST: redis
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

---

## 5. 前端部署步骤

### 5.1 源码部署

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 配置API地址
# 编辑 .env.production
VITE_API_BASE_URL=https://your-domain.com/api

# 4. 构建
npm run build

# 5. 部署到静态服务器
# 将 dist 目录部署到Nginx或其他静态服务器
```

### 5.2 Nginx部署

将构建后的 `dist` 目录复制到Nginx静态目录：

```bash
cp -r dist/* /usr/share/nginx/html/water-management/
```

---

## 6. Nginx反向代理配置

### 6.1 完整配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html/water-management;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Gzip压缩
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
        gzip_comp_level 6;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时配置
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 文件上传大小限制
    client_max_body_size 50M;

    # 访问日志
    access_log /var/log/nginx/water-management.access.log;
    error_log /var/log/nginx/water-management.error.log;
}
```

### 6.2 HTTPS配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/your-domain.pem;
    ssl_certificate_key /etc/nginx/ssl/your-domain.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 其余配置同上...
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 7. 常见问题排查

### 7.1 数据库连接问题

**问题**: 无法连接PostgreSQL

```bash
# 检查服务状态
sudo systemctl status postgresql-16

# 检查监听端口
netstat -tlnp | grep 5432

# 测试连接
psql -h localhost -U water_user -d water_management

# 检查pg_hba.conf配置
sudo vim /var/lib/pgsql/16/data/pg_hba.conf
```

**常见原因**:
- 防火墙阻止5432端口
- pg_hba.conf认证方式配置错误
- PostGIS扩展未正确安装

### 7.2 Redis连接问题

```bash
# 检查Redis状态
redis-cli ping

# 检查密码
redis-cli -a your_password ping

# 查看Redis日志
tail -f /var/log/redis/redis.log
```

### 7.3 端口占用问题

```bash
# 查看端口占用
netstat -tlnp | grep 3000

# 杀死占用进程
kill -9 <PID>
```

### 7.4 文件上传失败

**检查项**:
- UPLOAD_DIR目录是否存在且有写入权限
- 文件大小是否超过MAX_FILE_SIZE
- 文件类型是否在ALLOWED_FILE_TYPES中
- Nginx client_max_body_size配置

```bash
# 创建上传目录并设置权限
mkdir -p uploads
chmod 755 uploads
chown -R www-data:www-data uploads
```

### 7.5 JWT认证失败

**检查项**:
- JWT_SECRET是否正确配置
- Token是否过期
- 系统时间是否正确

### 7.6 PostGIS相关错误

```sql
-- 验证PostGIS版本
SELECT PostGIS_version();

-- 验证空间函数
SELECT ST_AsText(ST_Point(1, 1));
```

### 7.7 性能优化建议

1. **数据库优化**:
   - 为常用查询字段创建索引
   - 配置合理的连接池大小
   - 定期VACUUM和ANALYZE

2. **Redis优化**:
   - 开启RDB/AOF持久化
   - 配置内存淘汰策略
   - 使用连接池

3. **Nginx优化**:
   - 开启gzip压缩
   - 配置缓存策略
   - 启用HTTP/2

4. **应用优化**:
   - 开启PM2集群模式
   - 配置适当的日志级别
   - 定期清理日志文件

---

## 8. 监控与维护

### 8.1 日志查看

```bash
# 后端日志
tail -f logs/app.log

# PM2日志
pm2 logs water-backend

# Nginx日志
tail -f /var/log/nginx/access.log
```

### 8.2 数据库备份

```bash
# 备份数据库
pg_dump -U water_user water_management > backup_$(date +%Y%m%d).sql

# 压缩备份
pg_dump -U water_user water_management | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 8.3 定时任务

系统内置定时任务：

| 任务名称 | 执行频率 | 说明 |
|----------|----------|------|
| 水质数据聚合 | 每小时 | 自动计算水质达标率等指标 |
| 预警检测 | 每30分钟 | 检测水质超标预警 |
| 周报生成 | 每周一0点 | 自动生成周报 |
| 审批超时检查 | 每天0点 | 检查超时审批流程 |
| 数据清理 | 每月1号 | 清理历史数据归档 |
