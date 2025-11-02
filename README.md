# 数据爬取后台系统

基于 NestJS + Fastify + PostgreSQL + Redis 的动态数据爬取后台系统。

## 功能特性

- ✅ **动态项目管理**：支持创建多个爬取项目，每个项目有独立的数据库
- ✅ **动态表结构**：根据配置自动创建数据库表结构
- ✅ **版本管理**：支持项目配置变更时的版本控制
- ✅ **任务队列**：基于 Bull 的异步任务处理
- ✅ **数据去重**：自动检测并去除重复数据
- ✅ **灵活查询**：支持动态字段的条件查询

## 技术栈

- **框架**: NestJS + Fastify
- **数据库**: PostgreSQL
- **缓存/队列**: Redis + Bull
- **ORM**: TypeORM

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=crawler_main

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 服务端口
PORT=3000
```

### 3. 启动服务

```bash
# 开发模式
pnpm start:dev

# 生产模式
pnpm build
pnpm start:prod
```

## API 文档

### Swagger 文档

系统已集成 Swagger API 文档，启动服务后访问：

**Swagger UI**: `http://localhost:3000/api`

在 Swagger 界面中可以：
- 查看所有 API 接口文档
- 查看请求/响应参数说明
- 直接在浏览器中测试 API

### 1. 项目管理

#### 创建项目

```bash
POST /projects
Content-Type: application/json

{
  "name": "用户数据爬取",
  "api_url": "https://api.example.com/users",
  "method": "GET",
  "request_params": {
    "page": 1,
    "pageSize": 100
  },
  "response_structure": [
    {
      "key": "user_id",
      "type": "VARCHAR(255)",
      "nullable": false,
      "primary": true
    },
    {
      "key": "username",
      "type": "VARCHAR(100)",
      "nullable": false
    },
    {
      "key": "email",
      "type": "VARCHAR(255)",
      "nullable": true
    },
    {
      "key": "age",
      "type": "INTEGER",
      "nullable": true
    },
    {
      "key": "created_at",
      "type": "TIMESTAMP",
      "nullable": false,
      "default": "NOW()"
    }
  ]
}
```

#### 获取项目列表

```bash
GET /projects
```

#### 获取项目详情

```bash
GET /projects/:id
```

#### 更新项目

```bash
PATCH /projects/:id
Content-Type: application/json

{
  "name": "更新后的项目名",
  "response_structure": [...]
}
```

**注意**：如果更新了 `response_structure`，系统会自动：
- 版本号 +1
- 创建新的数据存储数据库（旧的保留）
- 后续任务将使用新版本

#### 删除项目

```bash
DELETE /projects/:id
```

### 2. 任务管理

#### 创建任务（自动加入队列）

```bash
POST /tasks
Content-Type: application/json

{
  "project_id": "项目ID",
  "request_params": {
    "page": 1
  }
}
```

#### 获取任务列表

```bash
GET /tasks?projectId=项目ID  # 可选：按项目筛选
```

#### 获取任务详情

```bash
GET /tasks/:id
```

### 3. 数据查询

#### 查询项目数据

```bash
POST /query
Content-Type: application/json

{
  "projectId": "项目ID",
  "version": 1,  // 可选，不指定则使用最新版本
  "filters": [
    {
      "field": "username",
      "operator": "LIKE",
      "value": "张%"
    },
    {
      "field": "age",
      "operator": ">=",
      "value": 18
    },
    {
      "field": "status",
      "operator": "IN",
      "values": ["active", "pending"]
    }
  ],
  "orderBy": "created_at",
  "order": "DESC",
  "limit": 20,
  "offset": 0
}
```

**支持的查询操作符**：
- `=` - 等于
- `!=` - 不等于
- `>` - 大于
- `<` - 小于
- `>=` - 大于等于
- `<=` - 小于等于
- `LIKE` - 模糊匹配
- `IN` - 在数组中

#### 获取项目所有版本

```bash
GET /query/versions/:projectId
```

## 数据库设计

### 主数据库 (`crawler_main`)

- **projects**: 项目表
- **tasks**: 任务表

### 项目配置数据库 (`project_{projectId}_config`)

- **project_config**: 项目配置表（存储版本等信息）

### 项目数据数据库 (`project_{projectId}_data_v{version}`)

- **crawl_data**: 数据表（结构动态生成）
  - `id`: UUID（主键）
  - `project_id`: UUID（关联项目）
  - `version`: INTEGER（版本号）
  - ...（动态字段）

## 版本管理机制

1. 创建项目时，自动创建版本 1 的数据数据库
2. 更新项目配置时：
   - 如果 `response_structure` 发生变化，版本自动 +1
   - 创建新的数据存储数据库（旧版本保留）
   - 更新项目配置数据库中的版本号
3. 创建任务时，自动使用项目当前版本
4. 数据查询可以指定版本，或使用最新版本

## 字段类型支持

支持以下 PostgreSQL 类型：

- `VARCHAR(n)`
- `TEXT`
- `INTEGER`
- `BIGINT`
- `DECIMAL(p,s)`
- `NUMERIC(p,s)`
- `BOOLEAN`
- `DATE`
- `TIMESTAMP`
- `TIMESTAMPTZ`
- `JSON`
- `JSONB`
- `UUID`

## 注意事项

1. **数据库权限**：确保 PostgreSQL 用户有创建数据库的权限
2. **Redis 连接**：确保 Redis 服务正常运行
3. **去重机制**：
   - 如果配置了主键字段，基于主键去重
   - 否则使用全字段哈希去重
4. **批量插入**：系统自动使用批量插入（每批100条）提高性能

## 开发

```bash
# 运行测试
pnpm test

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

## 许可证

UNLICENSED
