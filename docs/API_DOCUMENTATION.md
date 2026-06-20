# 水环境管理系统 API 接口文档

## 1. 接口总览

本文档提供水环境管理系统所有API接口的详细说明。

- **Base URL**: `http://localhost:3000/api`
- **API版本**: v1.0
- **数据格式**: JSON
- **字符编码**: UTF-8

### 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1699999999999
}
```

### 分页响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10
  },
  "timestamp": 1699999999999
}
```

## 2. 认证说明（JWT Token）

### 认证流程

1. 用户使用用户名和密码调用登录接口
2. 系统验证通过后返回 `accessToken` 和 `refreshToken`
3. 后续请求在Header中携带 `Authorization: Bearer {accessToken}`
4. `accessToken` 过期后，使用 `refreshToken` 调用刷新接口获取新的Token

### Token说明

- **Access Token**: 有效期7天，用于接口访问
- **Refresh Token**: 有效期30天，用于刷新Access Token

## 3. 权限说明（三级权限）

### 用户级别（UserLevel）

| 级别 | 代码 | 说明 |
|------|------|------|
| 国家级 | 1 | 可查看全国数据 |
| 省级 | 2 | 可查看本省及下属市县数据 |
| 市级 | 3 | 可查看本市数据 |

### 用户角色（UserRole）

| 角色 | 代码 | 权限 |
|------|------|------|
| 管理员 | admin | 全部权限 |
| 审批员 | approver | 审批、数据录入、查看 |
| 审核员 | auditor | 评估审核、查看 |
| 查看员 | viewer | 仅查看权限 |

## 4. 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未认证或Token无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 5. 认证接口

### 5.1 用户登录

**请求方式**: POST  
**路径**: `/api/auth/login`  
**权限**: 公开

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**请求示例**:
```json
{
  "username": "admin",
  "password": "123456"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
    "user": {
      "userId": 1,
      "username": "admin",
      "realName": "系统管理员",
      "userLevel": 1,
      "role": "admin"
    }
  },
  "timestamp": 1699999999999
}
```

---

### 5.2 用户登出

**请求方式**: POST  
**路径**: `/api/auth/logout`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| refreshToken | string | 是 | 刷新令牌 |

**请求示例**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "登出成功",
  "data": null,
  "timestamp": 1699999999999
}
```

---

### 5.3 刷新Token

**请求方式**: POST  
**路径**: `/api/auth/refresh`  
**权限**: 公开

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| refreshToken | string | 是 | 刷新令牌 |

**请求示例**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Token刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  },
  "timestamp": 1699999999999
}
```

---

### 5.4 获取用户信息

**请求方式**: GET  
**路径**: `/api/auth/profile`  
**权限**: 已认证

**响应示例**:
```json
{
  "code": 200,
  "message": "获取用户信息成功",
  "data": {
    "userId": 1,
    "username": "admin",
    "realName": "系统管理员",
    "phone": "13800138000",
    "email": "admin@example.com",
    "department": "信息中心",
    "position": "主任",
    "userLevel": 1,
    "regionId": 1,
    "role": "admin",
    "isActive": true
  },
  "timestamp": 1699999999999
}
```

---

### 5.5 修改密码

**请求方式**: PUT  
**路径**: `/api/auth/password`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| oldPassword | string | 是 | 原密码 |
| newPassword | string | 是 | 新密码（6-50位） |

**请求示例**:
```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "密码修改成功",
  "data": null,
  "timestamp": 1699999999999
}
```

---

## 6. 用户管理接口

### 6.1 获取用户列表

**请求方式**: GET  
**路径**: `/api/users`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页条数，默认10 |
| username | string | 否 | 用户名 |
| realName | string | 否 | 真实姓名 |
| userLevel | number | 否 | 用户级别（1-3） |
| regionId | number | 否 | 区域ID |
| role | string | 否 | 角色（admin/approver/auditor/viewer） |
| isActive | boolean | 否 | 是否启用 |

**响应示例**:
```json
{
  "code": 200,
  "message": "获取用户列表成功",
  "data": {
    "list": [
      {
        "userId": 1,
        "username": "admin",
        "realName": "系统管理员",
        "phone": "13800138000",
        "email": "admin@example.com",
        "department": "信息中心",
        "userLevel": 1,
        "regionId": 1,
        "role": "admin",
        "isActive": true
      }
    ],
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  },
  "timestamp": 1699999999999
}
```

---

### 6.2 获取用户详情

**请求方式**: GET  
**路径**: `/api/users/:id`  
**权限**: 已认证

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 用户ID |

---

### 6.3 创建用户

**请求方式**: POST  
**路径**: `/api/users`  
**权限**: 管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | string | 是 | 用户名（3-50位） |
| password | string | 是 | 密码（6-50位） |
| realName | string | 是 | 真实姓名（2-50位） |
| phone | string | 否 | 手机号 |
| email | string | 否 | 邮箱 |
| department | string | 否 | 部门 |
| position | string | 否 | 职位 |
| userLevel | number | 是 | 用户级别（1-3） |
| regionId | number | 是 | 区域ID |
| role | string | 否 | 角色，默认viewer |
| isActive | boolean | 否 | 是否启用，默认true |

---

### 6.4 更新用户

**请求方式**: PUT  
**路径**: `/api/users/:id`  
**权限**: 管理员

---

### 6.5 删除用户

**请求方式**: DELETE  
**路径**: `/api/users/:id`  
**权限**: 管理员

---

### 6.6 启用/禁用用户

**请求方式**: PUT  
**路径**: `/api/users/:id/status`  
**权限**: 管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| isActive | boolean | 是 | 是否启用 |

---

### 6.7 重置密码

**请求方式**: PUT  
**路径**: `/api/users/:id/password`  
**权限**: 管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| password | string | 是 | 新密码 |

---

## 7. 区域管理接口

### 7.1 获取区域列表

**请求方式**: GET  
**路径**: `/api/regions`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| regionCode | string | 否 | 区域编码 |
| regionName | string | 否 | 区域名称 |
| regionLevel | number | 否 | 区域级别（1-3） |
| parentId | number | 否 | 父级区域ID |
| isActive | boolean | 否 | 是否启用 |

---

### 7.2 获取区域树形结构

**请求方式**: GET  
**路径**: `/api/regions/tree`  
**权限**: 已认证

**响应示例**:
```json
{
  "code": 200,
  "message": "获取区域树形结构成功",
  "data": [
    {
      "regionId": 1,
      "regionCode": "100000",
      "regionName": "全国",
      "regionLevel": 1,
      "children": [
        {
          "regionId": 2,
          "regionCode": "110000",
          "regionName": "北京市",
          "regionLevel": 2,
          "children": []
        }
      ]
    }
  ],
  "timestamp": 1699999999999
}
```

---

### 7.3 获取区域统计

**请求方式**: GET  
**路径**: `/api/regions/statistics`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 否 | 区域ID |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |

---

### 7.4 获取区域详情

**请求方式**: GET  
**路径**: `/api/regions/:id`  
**权限**: 已认证

---

### 7.5 创建区域

**请求方式**: POST  
**路径**: `/api/regions`  
**权限**: 管理员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionCode | string | 是 | 区域编码 |
| regionName | string | 是 | 区域名称 |
| regionLevel | number | 是 | 区域级别（1-3） |
| parentId | number | 否 | 父级区域ID |
| regionAbbr | string | 否 | 区域简称 |
| provinceName | string | 否 | 省名称 |
| cityName | string | 否 | 市名称 |
| countyName | string | 否 | 县名称 |
| area | number | 否 | 面积 |
| population | number | 否 | 人口 |
| sortOrder | number | 否 | 排序 |
| isActive | boolean | 否 | 是否启用 |

---

### 7.6 更新区域

**请求方式**: PUT  
**路径**: `/api/regions/:id`  
**权限**: 管理员

---

### 7.7 启用/禁用区域

**请求方式**: PUT  
**路径**: `/api/regions/:id/active`  
**权限**: 管理员

---

### 7.8 删除区域

**请求方式**: DELETE  
**路径**: `/api/regions/:id`  
**权限**: 管理员

---

## 8. 水体管理接口

### 8.1 获取水体列表

**请求方式**: GET  
**路径**: `/api/water-bodies`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| waterBodyCode | string | 否 | 水体编码 |
| waterBodyName | string | 否 | 水体名称 |
| waterBodyType | number | 否 | 水体类型（1-4） |
| waterBodyLevel | number | 否 | 水体级别（1-4） |
| regionId | number | 否 | 区域ID |
| governanceStage | number | 否 | 治理阶段（1-4） |
| currentStatus | number | 否 | 状态（1-4） |
| isActive | boolean | 否 | 是否启用 |

**水体类型说明**:
- 1: 河流
- 2: 湖泊
- 3: 塘坑
- 4: 其他

**水体级别说明**:
- 1: 黑臭
- 2: 轻度黑臭
- 3: 重度黑臭
- 4: 已消除

---

### 8.2 获取水体详情

**请求方式**: GET  
**路径**: `/api/water-bodies/:id`  
**权限**: 已认证

---

### 8.3 创建水体

**请求方式**: POST  
**路径**: `/api/water-bodies`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| waterBodyCode | string | 是 | 水体编码 |
| waterBodyName | string | 是 | 水体名称 |
| waterBodyType | number | 是 | 水体类型 |
| waterBodyLevel | number | 是 | 水体级别 |
| regionId | number | 是 | 区域ID |
| administrativeVillage | string | 否 | 行政村 |
| waterLength | number | 否 | 长度（米） |
| waterArea | number | 否 | 面积（平方米） |
| catchmentArea | number | 否 | 汇水面积 |
| surroundingPopulation | number | 否 | 周边人口 |
| governanceStage | number | 否 | 治理阶段 |
| currentStatus | number | 否 | 状态 |
| plannedCompletionDate | string | 否 | 计划完成日期 |
| totalInvestment | number | 否 | 总投资 |
| responsibleUnit | string | 否 | 责任单位 |
| responsiblePerson | string | 否 | 责任人 |
| responsiblePhone | string | 否 | 联系电话 |

---

### 8.4 更新水体

**请求方式**: PUT  
**路径**: `/api/water-bodies/:id`  
**权限**: 管理员、审批员

---

### 8.5 更新水体状态

**请求方式**: PUT  
**路径**: `/api/water-bodies/:id/status`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| currentStatus | number | 是 | 状态（1-4） |

**状态说明**:
- 1: 治理中
- 2: 已完成
- 3: 反弹
- 4: 销号

---

### 8.6 更新治理阶段

**请求方式**: PUT  
**路径**: `/api/water-bodies/:id/stage`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| governanceStage | number | 是 | 治理阶段（1-4） |

**治理阶段说明**:
- 1: 方案制定
- 2: 工程建设
- 3: 效果评估
- 4: 长效管理

---

### 8.7 启用/禁用水体

**请求方式**: PUT  
**路径**: `/api/water-bodies/:id/active`  
**权限**: 管理员

---

### 8.8 删除水体

**请求方式**: DELETE  
**路径**: `/api/water-bodies/:id`  
**权限**: 管理员

---

## 9. 排污口管理接口

### 9.1 获取排污口列表

**请求方式**: GET  
**路径**: `/api/sewage-outlets`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| outletCode | string | 否 | 排污口编码 |
| outletName | string | 否 | 排污口名称 |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| outletType | number | 否 | 排污口类型（1-4） |
| isMonitored | boolean | 否 | 是否监测 |
| isActive | boolean | 否 | 是否启用 |

**排污口类型说明**:
- 1: 工业
- 2: 生活
- 3: 混合
- 4: 农业

---

### 9.2 获取附近排污口

**请求方式**: GET  
**路径**: `/api/sewage-outlets/nearby`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| longitude | number | 是 | 经度 |
| latitude | number | 是 | 纬度 |
| radius | number | 是 | 搜索半径（米） |
| outletType | number | 否 | 排污口类型 |
| isActive | boolean | 否 | 是否启用，默认true |

---

### 9.3 获取区域排污口列表

**请求方式**: GET  
**路径**: `/api/sewage-outlets/region/:regionId`  
**权限**: 已认证

---

### 9.4 获取水体排污口列表

**请求方式**: GET  
**路径**: `/api/sewage-outlets/water-body/:waterBodyId`  
**权限**: 已认证

---

### 9.5 获取排污口详情

**请求方式**: GET  
**路径**: `/api/sewage-outlets/:id`  
**权限**: 已认证

---

### 9.6 创建排污口

**请求方式**: POST  
**路径**: `/api/sewage-outlets`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| outletCode | string | 是 | 排污口编码 |
| outletName | string | 是 | 排污口名称 |
| waterBodyId | number | 是 | 水体ID |
| outletType | number | 是 | 排污口类型 |
| dischargeMethod | number | 否 | 排放方式（1-3） |
| designDischargeCapacity | number | 否 | 设计排放量 |
| actualDischargeCapacity | number | 否 | 实际排放量 |
| location | object | 是 | 位置坐标 {type, coordinates} |
| address | string | 否 | 地址 |
| dischargeStandard | string | 否 | 排放标准 |
| nh3nLimit | number | 否 | 氨氮限值 |
| tpLimit | number | 否 | 总磷限值 |
| codLimit | number | 否 | COD限值 |
| isMonitored | boolean | 否 | 是否监测，默认true |

---

### 9.7 更新排污口

**请求方式**: PUT  
**路径**: `/api/sewage-outlets/:id`  
**权限**: 管理员、审批员

---

### 9.8 启用/禁用排污口

**请求方式**: PUT  
**路径**: `/api/sewage-outlets/:id/status`  
**权限**: 管理员、审批员

---

### 9.9 删除排污口

**请求方式**: DELETE  
**路径**: `/api/sewage-outlets/:id`  
**权限**: 管理员

---

## 10. 水质监测接口

### 10.1 获取水质数据列表

**请求方式**: GET  
**路径**: `/api/water-quality`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| outletId | number | 否 | 排污口ID |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| isCompliant | boolean | 否 | 是否达标 |
| isNh3nOverproof | boolean | 否 | 氨氮是否超标 |
| isTpOverproof | boolean | 否 | 总磷是否超标 |
| dataQuality | number | 否 | 数据质量（1-4） |

---

### 10.2 获取水质趋势数据

**请求方式**: GET  
**路径**: `/api/water-quality/trend`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| outletId | number | 否 | 排污口ID |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| startTime | string | 是 | 开始时间 |
| endTime | string | 是 | 结束时间 |
| period | string | 否 | 统计周期（day/week/month） |

**响应示例**:
```json
{
  "code": 200,
  "message": "获取水质趋势数据成功",
  "data": [
    {
      "date": "2024-01-01",
      "ammoniaNitrogenAvg": 2.5,
      "totalPhosphorusAvg": 0.8,
      "codAvg": 35,
      "dissolvedOxygenAvg": 5.2,
      "complianceRate": 75.5
    }
  ],
  "timestamp": 1699999999999
}
```

---

### 10.3 获取聚合数据

**请求方式**: GET  
**路径**: `/api/water-quality/aggregation`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| groupBy | string | 是 | 聚合维度（waterBody/region/governanceStage） |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |

---

### 10.4 导出水质数据

**请求方式**: GET  
**路径**: `/api/water-quality/export`  
**权限**: 已认证

---

### 10.5 获取水质数据详情

**请求方式**: GET  
**路径**: `/api/water-quality/:id`  
**权限**: 已认证

---

### 10.6 创建水质数据

**请求方式**: POST  
**路径**: `/api/water-quality`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| outletId | number | 是 | 排污口ID |
| monitorTime | string | 是 | 监测时间 |
| waterTemperature | number | 否 | 水温（-20~50℃） |
| phValue | number | 否 | PH值（0~14） |
| dissolvedOxygen | number | 否 | 溶解氧（mg/L） |
| ammoniaNitrogen | number | 否 | 氨氮（mg/L） |
| totalPhosphorus | number | 否 | 总磷（mg/L） |
| totalNitrogen | number | 否 | 总氮（mg/L） |
| cod | number | 否 | COD（mg/L） |
| bod5 | number | 否 | BOD5（mg/L） |
| transparency | number | 否 | 透明度（cm） |
| conductivity | number | 否 | 电导率 |
| turbidity | number | 否 | 浊度 |
| flowRate | number | 否 | 流量 |

---

### 10.7 批量导入水质数据

**请求方式**: POST  
**路径**: `/api/water-quality/batch`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| data | array | 是 | 水质数据数组 |

---

### 10.8 更新水质数据

**请求方式**: PUT  
**路径**: `/api/water-quality/:id`  
**权限**: 管理员、审批员

---

### 10.9 删除水质数据

**请求方式**: DELETE  
**路径**: `/api/water-quality/:id`  
**权限**: 管理员

---

## 11. 项目管理接口

### 11.1 获取治理项目列表

**请求方式**: GET  
**路径**: `/api/governance-projects`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| projectCode | string | 否 | 项目编码 |
| projectName | string | 否 | 项目名称 |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| projectType | number | 否 | 项目类型（1-6） |
| projectStatus | number | 否 | 项目状态（1-5） |
| isKeyProject | boolean | 否 | 是否重点项目 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |

**项目类型说明**:
- 1: 截污纳管
- 2: 清淤疏浚
- 3: 生态修复
- 4: 活水循环
- 5: 面源治理
- 6: 其他

**项目状态说明**:
- 1: 未开工
- 2: 建设中
- 3: 已完工
- 4: 已验收
- 5: 延期

---

### 11.2 获取项目统计

**请求方式**: GET  
**路径**: `/api/governance-projects/statistics`  
**权限**: 已认证

---

### 11.3 获取项目详情

**请求方式**: GET  
**路径**: `/api/governance-projects/:id`  
**权限**: 已认证

---

### 11.4 创建治理项目

**请求方式**: POST  
**路径**: `/api/governance-projects`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectCode | string | 是 | 项目编码 |
| projectName | string | 是 | 项目名称 |
| projectType | number | 是 | 项目类型 |
| waterBodyId | number | 是 | 水体ID |
| projectDescription | string | 否 | 项目描述 |
| isKeyProject | boolean | 否 | 是否重点项目 |
| plannedStartDate | string | 是 | 计划开始日期 |
| plannedEndDate | string | 是 | 计划结束日期 |
| plannedInvestment | number | 否 | 计划投资 |
| actualProgress | number | 否 | 实际进度（0-100） |
| projectStatus | number | 否 | 项目状态 |
| constructionContent | string | 否 | 建设内容 |
| responsibleUnit | string | 否 | 责任单位 |
| responsiblePerson | string | 否 | 责任人 |

---

### 11.5 更新治理项目

**请求方式**: PUT  
**路径**: `/api/governance-projects/:id`  
**权限**: 管理员、审批员

---

### 11.6 更新项目进度

**请求方式**: PUT  
**路径**: `/api/governance-projects/:id/progress`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| actualProgress | number | 是 | 实际进度（0-100） |

---

### 11.7 更新项目状态

**请求方式**: PUT  
**路径**: `/api/governance-projects/:id/status`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectStatus | number | 是 | 项目状态（1-5） |

---

### 11.8 删除治理项目

**请求方式**: DELETE  
**路径**: `/api/governance-projects/:id`  
**权限**: 管理员

---

## 12. 进度报告接口

### 12.1 获取进度月报列表

**请求方式**: GET  
**路径**: `/api/progress-reports`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| projectId | number | 否 | 项目ID |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| reportPeriod | string | 否 | 报告期（如2024-01） |
| reportStatus | number | 否 | 报告状态（1-3） |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |

**报告状态说明**:
- 1: 草稿
- 2: 已提交
- 3: 已审核

---

### 12.2 获取进度趋势

**请求方式**: GET  
**路径**: `/api/progress-reports/trend`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | number | 是 | 项目ID |
| startTime | string | 是 | 开始时间 |
| endTime | string | 是 | 结束时间 |

---

### 12.3 获取进度月报详情

**请求方式**: GET  
**路径**: `/api/progress-reports/:id`  
**权限**: 已认证

---

### 12.4 创建进度月报

**请求方式**: POST  
**路径**: `/api/progress-reports`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| projectId | number | 是 | 项目ID |
| reportPeriod | string | 是 | 报告期 |
| reportDate | string | 是 | 报告日期 |
| monthlyPlannedProgress | number | 是 | 本月计划进度（0-100） |
| monthlyActualProgress | number | 是 | 本月实际进度（0-100） |
| cumulativePlannedProgress | number | 是 | 累计计划进度（0-100） |
| cumulativeActualProgress | number | 是 | 累计实际进度（0-100） |
| monthlyWorkContent | string | 否 | 本月工作内容 |
| monthlyProblems | string | 否 | 本月存在问题 |
| nextMonthPlan | string | 否 | 下月计划 |
| monthlyInvestmentPlan | number | 否 | 本月计划投资 |
| monthlyActualInvestment | number | 否 | 本月实际投资 |

---

### 12.5 更新进度月报

**请求方式**: PUT  
**路径**: `/api/progress-reports/:id`  
**权限**: 管理员、审批员

---

### 12.6 提交进度月报

**请求方式**: PUT  
**路径**: `/api/progress-reports/:id/submit`  
**权限**: 管理员、审批员

---

### 12.7 审核进度月报

**请求方式**: PUT  
**路径**: `/api/progress-reports/:id/review`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| approved | boolean | 是 | 是否通过 |

---

### 12.8 删除进度月报

**请求方式**: DELETE  
**路径**: `/api/progress-reports/:id`  
**权限**: 管理员

---

## 13. 投诉工单接口

### 13.1 获取投诉工单列表

**请求方式**: GET  
**路径**: `/api/complaints`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| complaintCode | string | 否 | 工单编号 |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| complaintType | number | 否 | 投诉类型（1-6） |
| orderStatus | number | 否 | 工单状态（1-5） |
| priority | number | 否 | 优先级（1-3） |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| handlerPerson | string | 否 | 处理人 |

**投诉类型说明**:
- 1: 黑臭水体
- 2: 污水排放
- 3: 漂浮垃圾
- 4: 植被破坏
- 5: 设施损坏
- 6: 其他

**工单状态说明**:
- 1: 待受理
- 2: 处理中
- 3: 已处理
- 4: 已回访
- 5: 已结案

**优先级说明**:
- 1: 紧急
- 2: 正常
- 3: 低

---

### 13.2 获取投诉统计

**请求方式**: GET  
**路径**: `/api/complaints/statistics`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| groupBy | string | 否 | 分组维度（complaintType/orderStatus/region/month） |

---

### 13.3 获取投诉工单详情

**请求方式**: GET  
**路径**: `/api/complaints/:id`  
**权限**: 已认证

---

### 13.4 创建投诉工单

**请求方式**: POST  
**路径**: `/api/complaints`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| complaintSource | number | 是 | 投诉来源（1-6） |
| complaintType | number | 是 | 投诉类型 |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| complaintTime | string | 是 | 投诉时间 |
| complainant | string | 否 | 投诉人 |
| contactPhone | string | 否 | 联系电话 |
| complaintContent | string | 是 | 投诉内容 |
| location | object | 否 | 位置坐标 |
| address | string | 否 | 地址 |
| priority | number | 否 | 优先级 |
| hotKeywords | array | 否 | 热点关键词 |
| attachments | array | 否 | 附件 |

**投诉来源说明**:
- 1: 电话
- 2: 微信
- 3: 网站
- 4: APP
- 5: 信件
- 6: 现场

---

### 13.5 更新投诉工单

**请求方式**: PUT  
**路径**: `/api/complaints/:id`  
**权限**: 管理员、审批员

---

### 13.6 受理投诉工单

**请求方式**: PUT  
**路径**: `/api/complaints/:id/accept`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| handlerUnit | string | 是 | 处理单位 |
| handlerPerson | string | 是 | 处理人 |
| deadline | string | 是 | 截止时间 |

---

### 13.7 处理投诉工单

**请求方式**: PUT  
**路径**: `/api/complaints/:id/process`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| processResult | string | 是 | 处理结果 |

---

### 13.8 回访投诉工单

**请求方式**: PUT  
**路径**: `/api/complaints/:id/follow-up`  
**权限**: 管理员、审批员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| satisfactionScore | number | 是 | 满意度评分（1-5） |
| satisfactionFeedback | string | 否 | 满意度反馈 |

---

### 13.9 结案投诉工单

**请求方式**: PUT  
**路径**: `/api/complaints/:id/close`  
**权限**: 管理员、审批员

---

### 13.10 删除投诉工单

**请求方式**: DELETE  
**路径**: `/api/complaints/:id`  
**权限**: 管理员

---

## 14. 生态评估接口

### 14.1 获取生态评估列表

**请求方式**: GET  
**路径**: `/api/assessments`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| assessmentCode | string | 否 | 评估编号 |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 否 | 区域ID |
| assessmentType | number | 否 | 评估类型（1-4） |
| assessmentLevel | string | 否 | 评估等级 |
| isApproved | boolean | 否 | 是否已审核 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |

**评估类型说明**:
- 1: 季度评估
- 2: 年度评估
- 3: 竣工验收
- 4: 专项评估

**评估等级说明**:
- 优秀
- 良好
- 合格
- 不合格

---

### 14.2 获取历史评估对比

**请求方式**: GET  
**路径**: `/api/assessments/comparison`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| waterBodyId | number | 是 | 水体ID |
| startTime | string | 是 | 开始时间 |
| endTime | string | 是 | 结束时间 |
| assessmentType | number | 否 | 评估类型 |

---

### 14.3 获取生态评估详情

**请求方式**: GET  
**路径**: `/api/assessments/:id`  
**权限**: 已认证

---

### 14.4 创建生态评估

**请求方式**: POST  
**路径**: `/api/assessments`  
**权限**: 管理员、审批员、审核员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| waterBodyId | number | 是 | 水体ID |
| assessmentType | number | 是 | 评估类型 |
| assessmentDate | string | 是 | 评估日期 |
| assessmentPeriod | string | 否 | 评估期 |
| waterQualityScore | number | 是 | 水质评分（0-100） |
| ecologicalIndex | number | 是 | 生态指数（0-100） |
| landscapeScore | number | 是 | 景观评分（0-100） |
| managementScore | number | 是 | 管理评分（0-100） |
| biodiversityIndex | number | 否 | 生物多样性指数（0-100） |
| vegetationCoverage | number | 否 | 植被覆盖率（0-100） |
| habitatQuality | number | 否 | 栖息地质量（0-100） |
| assessmentOpinion | string | 否 | 评估意见 |
| problemDescription | string | 否 | 问题描述 |
| improvementSuggestions | string | 否 | 改进建议 |

---

### 14.5 更新生态评估

**请求方式**: PUT  
**路径**: `/api/assessments/:id`  
**权限**: 管理员、审批员、审核员

---

### 14.6 审核生态评估

**请求方式**: PUT  
**路径**: `/api/assessments/:id/approve`  
**权限**: 管理员、审批员

---

### 14.7 删除生态评估

**请求方式**: DELETE  
**路径**: `/api/assessments/:id`  
**权限**: 管理员

---

## 15. 统计数据接口

### 15.1 获取统计列表

**请求方式**: GET  
**路径**: `/api/stats`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| statType | number | 否 | 统计类型（1-4） |
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| outletId | number | 否 | 排污口ID |
| projectId | number | 否 | 项目ID |
| statPeriod | string | 否 | 统计周期 |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**统计类型说明**:
- 1: 区域统计
- 2: 水体统计
- 3: 排污口统计
- 4: 项目统计

---

### 15.2 获取最新统计数据

**请求方式**: GET  
**路径**: `/api/stats/latest`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| statType | number | 是 | 统计类型 |
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| outletId | number | 否 | 排污口ID |
| projectId | number | 否 | 项目ID |

---

### 15.3 获取趋势统计数据

**请求方式**: GET  
**路径**: `/api/stats/trend`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| statType | number | 是 | 统计类型 |
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |

---

### 15.4 计算水质达标率

**请求方式**: GET  
**路径**: `/api/stats/calculate/water-quality`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| outletId | number | 否 | 排污口ID |
| days | number | 否 | 统计天数，默认7 |

---

### 15.5 计算治理完成率

**请求方式**: GET  
**路径**: `/api/stats/calculate/governance`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| projectId | number | 否 | 项目ID |

---

### 15.6 计算公众满意度

**请求方式**: GET  
**路径**: `/api/stats/calculate/satisfaction`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| days | number | 否 | 统计天数，默认30 |

---

### 15.7 计算排污口异常指数

**请求方式**: GET  
**路径**: `/api/stats/calculate/outlet-abnormal`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| outletId | number | 否 | 排污口ID |
| days | number | 否 | 统计天数，默认3 |

---

### 15.8 重新计算统计数据

**请求方式**: POST  
**路径**: `/api/stats/recalculate`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| statDate | string | 否 | 统计日期，默认今天 |

---

## 16. 预警管理接口

### 16.1 获取预警列表

**请求方式**: GET  
**路径**: `/api/alerts`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| alertType | number | 否 | 预警类型（1-4） |
| alertLevel | number | 否 | 预警级别（1-3） |
| alertStatus | number | 否 | 预警状态（1-5） |
| regionId | number | 否 | 区域ID |
| sourceType | number | 否 | 来源类型（1-4） |
| sourceId | number | 否 | 来源ID |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**预警类型说明**:
- 1: 水质超标
- 2: 进度滞后
- 3: 资金异常
- 4: 投诉集中

**预警级别说明**:
- 1: 一级（最高）
- 2: 二级
- 3: 三级

**预警状态说明**:
- 1: 待处理
- 2: 处理中
- 3: 已处理
- 4: 已解除
- 5: 已忽略

---

### 16.2 获取预警统计

**请求方式**: GET  
**路径**: `/api/alerts/statistics`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 否 | 区域ID |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

---

### 16.3 获取预警详情

**请求方式**: GET  
**路径**: `/api/alerts/:id`  
**权限**: 已认证

---

### 16.4 处理预警

**请求方式**: PUT  
**路径**: `/api/alerts/:id/handle`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| handleMeasure | string | 是 | 处理措施 |
| handleResult | string | 否 | 处理结果 |
| handlerUnit | string | 否 | 处理单位 |
| handlerPerson | string | 否 | 处理人 |

---

### 16.5 解除预警

**请求方式**: PUT  
**路径**: `/api/alerts/:id/resolve`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| handleMeasure | string | 是 | 处理措施 |
| handleResult | string | 是 | 处理结果 |

---

### 16.6 忽略预警

**请求方式**: PUT  
**路径**: `/api/alerts/:id/ignore`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| ignoreReason | string | 是 | 忽略原因 |

---

### 16.7 检测预警

**请求方式**: POST  
**路径**: `/api/alerts/detect`  
**权限**: 已认证

---

## 17. 审批流程接口

### 17.1 获取审批列表

**请求方式**: GET  
**路径**: `/api/approvals`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| workflowType | number | 否 | 流程类型（1-4） |
| workflowStatus | number | 否 | 流程状态（1-4） |
| currentStage | number | 否 | 当前阶段（1-5） |
| regionId | number | 否 | 区域ID |
| applicantId | number | 否 | 申请人ID |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**流程类型说明**:
- 1: 治理方案调整
- 2: 应急截污
- 3: 项目延期
- 4: 资金调整

**流程状态说明**:
- 1: 审批中
- 2: 已通过
- 3: 已拒绝
- 4: 已撤销

**审批阶段说明**:
- 1: 待一级审批
- 2: 待二级审批
- 3: 待三级审批
- 4: 已完成
- 5: 已拒绝

---

### 17.2 获取待审批数量

**请求方式**: GET  
**路径**: `/api/approvals/pending/count`  
**权限**: 已认证

**响应示例**:
```json
{
  "code": 200,
  "message": "获取待审批数量成功",
  "data": {
    "count": 5
  },
  "timestamp": 1699999999999
}
```

---

### 17.3 获取审批详情

**请求方式**: GET  
**路径**: `/api/approvals/:id`  
**权限**: 已认证

---

### 17.4 获取审批历史

**请求方式**: GET  
**路径**: `/api/approvals/:id/history`  
**权限**: 已认证

---

### 17.5 创建审批流程

**请求方式**: POST  
**路径**: `/api/approvals`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| workflowType | number | 是 | 流程类型 |
| relatedAlertId | number | 否 | 关联预警ID |
| projectId | number | 否 | 项目ID |
| waterBodyId | number | 否 | 水体ID |
| regionId | number | 是 | 区域ID |
| applicationContent | string | 是 | 申请内容 |
| applicationReason | string | 是 | 申请理由 |
| proposedScheme | string | 否 | 拟定方案 |
| expectedEffect | string | 否 | 预期效果 |

---

### 17.6 一级审批

**请求方式**: PUT  
**路径**: `/api/approvals/:id/approve/stage1`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| opinion | string | 是 | 审批意见 |
| result | number | 是 | 审批结果（1-通过，2-拒绝） |

---

### 17.7 二级审批

**请求方式**: PUT  
**路径**: `/api/approvals/:id/approve/stage2`  
**权限**: 已认证

**请求参数**: 同一级审批

---

### 17.8 三级审批

**请求方式**: PUT  
**路径**: `/api/approvals/:id/approve/stage3`  
**权限**: 已认证

**请求参数**: 同一级审批

---

### 17.9 撤销审批

**请求方式**: PUT  
**路径**: `/api/approvals/:id/cancel`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| reason | string | 是 | 撤销原因 |

---

### 17.10 检查审批超时

**请求方式**: POST  
**路径**: `/api/approvals/check-timeout`  
**权限**: 已认证

---

## 18. 任务资金接口

### 18.1 获取任务列表

**请求方式**: GET  
**路径**: `/api/tasks`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| year | number | 否 | 年份 |
| regionId | number | 否 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| taskType | number | 否 | 任务类型（1-4） |
| taskStatus | number | 否 | 任务状态（1-4） |
| isBudgetAbnormal | boolean | 否 | 是否预算异常 |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**任务类型说明**:
- 1: 水体消除
- 2: 项目建设
- 3: 水质提升
- 4: 生态修复

**任务状态说明**:
- 1: 未开始
- 2: 进行中
- 3: 已完成
- 4: 延期

---

### 18.2 获取任务统计

**请求方式**: GET  
**路径**: `/api/tasks/statistics`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| year | number | 否 | 年份 |
| regionId | number | 否 | 区域ID |

---

### 18.3 获取任务详情

**请求方式**: GET  
**路径**: `/api/tasks/:id`  
**权限**: 已认证

---

### 18.4 获取资金拨付记录

**请求方式**: GET  
**路径**: `/api/tasks/:id/funds`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| fundType | number | 否 | 资金类型（1-5） |
| paymentStatus | number | 否 | 支付状态（1-3） |

**资金类型说明**:
- 1: 中央财政
- 2: 省级财政
- 3: 市级财政
- 4: 自筹
- 5: 其他

**支付状态说明**:
- 1: 待支付
- 2: 已支付
- 3: 已退回

---

### 18.5 创建任务

**请求方式**: POST  
**路径**: `/api/tasks`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| year | number | 是 | 年份 |
| regionId | number | 是 | 区域ID |
| waterBodyId | number | 否 | 水体ID |
| taskType | number | 是 | 任务类型 |
| taskContent | string | 是 | 任务内容 |
| taskCode | string | 否 | 任务编码 |
| plannedStartDate | string | 否 | 计划开始日期 |
| plannedEndDate | string | 否 | 计划结束日期 |
| plannedBudget | number | 否 | 计划预算 |
| responsibleUnit | string | 否 | 责任单位 |
| responsiblePerson | string | 否 | 责任人 |

---

### 18.6 更新任务

**请求方式**: PUT  
**路径**: `/api/tasks/:id`  
**权限**: 已认证

---

### 18.7 删除任务

**请求方式**: DELETE  
**路径**: `/api/tasks/:id`  
**权限**: 已认证

---

### 18.8 导入年度任务

**请求方式**: POST  
**路径**: `/api/tasks/import`  
**权限**: 已认证

**请求方式**: multipart/form-data

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | file | 是 | Excel文件 |
| year | number | 否 | 年份 |

---

### 18.9 创建资金拨付记录

**请求方式**: POST  
**路径**: `/api/tasks/funds`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| taskId | number | 是 | 任务ID |
| projectId | number | 否 | 项目ID |
| fundType | number | 是 | 资金类型 |
| amount | number | 是 | 金额 |
| paymentDate | string | 否 | 支付日期 |
| paymentStatus | number | 否 | 支付状态 |
| payer | string | 否 | 付款方 |
| receiver | string | 否 | 收款方 |
| voucherNumber | string | 否 | 凭证号 |

---

### 18.10 校验资金任务匹配

**请求方式**: POST  
**路径**: `/api/tasks/:id/validate-fund`  
**权限**: 已认证

---

### 18.11 检查资金异常

**请求方式**: POST  
**路径**: `/api/tasks/check-fund-abnormal`  
**权限**: 已认证

---

## 19. 报告管理接口

### 19.1 获取报告列表

**请求方式**: GET  
**路径**: `/api/reports`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| reportYear | number | 否 | 报告年份 |
| reportWeek | number | 否 | 报告周数 |
| regionId | number | 否 | 区域ID |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

---

### 19.2 获取报告详情

**请求方式**: GET  
**路径**: `/api/reports/:id`  
**权限**: 已认证

---

### 19.3 导出报告

**请求方式**: GET  
**路径**: `/api/reports/:id/export`  
**权限**: 已认证

**响应**: Excel文件下载

---

### 19.4 获取周报数据

**请求方式**: GET  
**路径**: `/api/reports/data/weekly`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 是 | 区域ID |
| referenceDate | string | 否 | 参考日期，默认今天 |

---

### 19.5 生成周报

**请求方式**: POST  
**路径**: `/api/reports/generate/weekly`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| regionId | number | 否 | 区域ID |
| referenceDate | string | 否 | 参考日期 |

---

### 19.6 批量生成周报

**请求方式**: POST  
**路径**: `/api/reports/generate/weekly/all`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| referenceDate | string | 否 | 参考日期 |

---

## 20. 系统配置接口

### 20.1 获取配置列表

**请求方式**: GET  
**路径**: `/api/configs`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| configType | string | 否 | 配置类型 |
| configKey | string | 否 | 配置键 |
| isEditable | boolean | 否 | 是否可编辑 |

---

### 20.2 获取所有配置

**请求方式**: GET  
**路径**: `/api/configs/all`  
**权限**: 已认证

---

### 20.3 获取配置值

**请求方式**: GET  
**路径**: `/api/configs/value/:key`  
**权限**: 已认证

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| key | string | 是 | 配置键 |

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| default | string | 否 | 默认值 |

---

### 20.4 获取配置详情

**请求方式**: GET  
**路径**: `/api/configs/:id`  
**权限**: 已认证

---

### 20.5 创建配置

**请求方式**: POST  
**路径**: `/api/configs`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configKey | string | 是 | 配置键 |
| configValue | string | 是 | 配置值 |
| configType | string | 否 | 配置类型（string/number/boolean/json） |
| description | string | 否 | 描述 |
| isEditable | boolean | 否 | 是否可编辑 |

---

### 20.6 更新配置

**请求方式**: PUT  
**路径**: `/api/configs/:id`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configValue | string | 是 | 配置值 |
| description | string | 否 | 描述 |

---

### 20.7 按键更新配置

**请求方式**: PUT  
**路径**: `/api/configs/key/:key`  
**权限**: 已认证

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| key | string | 是 | 配置键 |

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configValue | string | 是 | 配置值 |

---

### 20.8 删除配置

**请求方式**: DELETE  
**路径**: `/api/configs/:id`  
**权限**: 已认证

---

### 20.9 批量更新配置

**请求方式**: POST  
**路径**: `/api/configs/batch-update`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configs | array | 是 | 配置数组 [{configKey, configValue}] |

---

### 20.10 初始化默认配置

**请求方式**: POST  
**路径**: `/api/configs/init-defaults`  
**权限**: 已认证

---

### 20.11 清除配置缓存

**请求方式**: POST  
**路径**: `/api/configs/clear-cache`  
**权限**: 已认证

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configKey | string | 否 | 配置键，不传则清除所有 |

---

### 20.12 获取定时任务列表

**请求方式**: GET  
**路径**: `/api/configs/jobs`  
**权限**: 已认证

---

### 20.13 启动定时任务

**请求方式**: POST  
**路径**: `/api/configs/jobs/:name/start`  
**权限**: 已认证

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 任务名称 |

---

### 20.14 停止定时任务

**请求方式**: POST  
**路径**: `/api/configs/jobs/:name/stop`  
**权限**: 已认证

---

### 20.15 手动执行定时任务

**请求方式**: POST  
**路径**: `/api/configs/jobs/:name/run`  
**权限**: 已认证

---

## 21. 健康检查

### 21.1 健康检查

**请求方式**: GET  
**路径**: `/health`  
**权限**: 公开

**响应示例**:
```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "status": "healthy",
    "environment": "development",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "services": {
      "database": "connected",
      "redis": "connected"
    }
  },
  "timestamp": 1699999999999
}
```

---

## 22. API根路径

### 22.1 API信息

**请求方式**: GET  
**路径**: `/api`  
**权限**: 公开

**响应示例**:
```json
{
  "code": 200,
  "message": "API v1.0",
  "data": {
    "version": "1.0.0",
    "endpoints": {
      "auth": "/api/auth/*",
      "stats": "/api/stats/*",
      "alerts": "/api/alerts/*",
      "approvals": "/api/approvals/*",
      "tasks": "/api/tasks/*",
      "reports": "/api/reports/*",
      "configs": "/api/configs/*"
    }
  },
  "timestamp": 1699999999999
}
```
