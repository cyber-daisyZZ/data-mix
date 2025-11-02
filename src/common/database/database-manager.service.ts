import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { ConfigService } from '@nestjs/config';

export interface FieldDefinition {
  key: string;
  type: string; // PostgreSQL类型：VARCHAR(255), INTEGER, JSONB, TIMESTAMP等
  nullable?: boolean;
  primary?: boolean;
  default?: string;
  unique?: boolean;
}

@Injectable()
export class DatabaseManagerService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseManagerService.name);
  private mainPool: Pool;
  private projectPools: Map<string, Pool> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // 初始化主数据库连接池
    const dbConfig = this.configService.get('database');
    this.mainPool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.logger.log('主数据库连接池初始化完成');
  }

  /**
   * 获取主数据库连接池
   */
  getMainPool(): Pool {
    return this.mainPool;
  }

  /**
   * 创建项目配置数据库
   */
  async createProjectConfigDatabase(projectId: string): Promise<void> {
    const dbName = `project_${projectId}_config`;
    await this.ensureDatabaseExists(dbName);
    
    const pool = await this.getOrCreatePool(dbName);
    
    // 创建配置表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_config (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 创建版本配置
    await pool.query(`
      INSERT INTO project_config (key, value, description)
      VALUES ('version', '1', '当前项目版本号')
      ON CONFLICT (key) DO NOTHING;
    `);

    this.logger.log(`项目配置数据库创建成功: ${dbName}`);
  }

  /**
   * 创建项目数据存储数据库（根据版本）
   */
  async createProjectDataDatabase(
    projectId: string,
    version: number,
  ): Promise<string> {
    const dbName = `project_${projectId}_data_v${version}`;
    await this.ensureDatabaseExists(dbName);
    this.logger.log(`项目数据数据库创建成功: ${dbName}`);
    return dbName;
  }

  /**
   * 在项目数据数据库中创建动态表
   */
  async createProjectDataTable(
    projectId: string,
    version: number,
    fieldDefinitions: FieldDefinition[],
  ): Promise<void> {
    const dbName = `project_${projectId}_data_v${version}`;
    const tableName = 'crawl_data';
    const pool = await this.getOrCreatePool(dbName);

    // 构建动态字段SQL
    const dynamicFields = fieldDefinitions
      .map((field) => {
        let columnDef = `"${field.key}" ${field.type}`;

        if (!field.nullable && !field.primary) {
          columnDef += ' NOT NULL';
        }

        if (field.default) {
          columnDef += ` DEFAULT ${field.default}`;
        }

        if (field.unique && !field.primary) {
          columnDef += ' UNIQUE';
        }

        return columnDef;
      })
      .join(',\n    ');

    // 构建完整的CREATE TABLE语句
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        -- 系统固定字段
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        version INTEGER NOT NULL DEFAULT ${version},
        
        -- 动态字段
        ${dynamicFields}
      );
      
      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_project_id ON ${tableName}(project_id);
      CREATE INDEX IF NOT EXISTS idx_version ON ${tableName}(version);
    `;

    await pool.query(createTableSQL);

    // 为配置中标记为primary的字段创建唯一索引（如果不是系统主键）
    for (const field of fieldDefinitions) {
      if (field.primary && field.key !== 'id') {
        await pool.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_${field.key} ON ${tableName}("${field.key}")`,
        );
      } else if (!field.primary && !field.nullable) {
        // 为非空的普通字段创建索引，提高查询性能
        await pool.query(
          `CREATE INDEX IF NOT EXISTS idx_${field.key} ON ${tableName}("${field.key}")`,
        );
      }
    }

    this.logger.log(`项目数据表创建成功: ${dbName}.${tableName}`);
  }

  /**
   * 获取项目数据数据库连接池
   */
  async getProjectDataPool(
    projectId: string,
    version: number,
  ): Promise<Pool> {
    const dbName = `project_${projectId}_data_v${version}`;
    return this.getOrCreatePool(dbName);
  }

  /**
   * 获取项目配置数据库连接池
   */
  async getProjectConfigPool(projectId: string): Promise<Pool> {
    const dbName = `project_${projectId}_config`;
    return this.getOrCreatePool(dbName);
  }

  /**
   * 更新项目配置数据库中的版本号
   */
  async updateProjectVersion(projectId: string, version: number): Promise<void> {
    const pool = await this.getProjectConfigPool(projectId);
    await pool.query(
      `UPDATE project_config SET value = $1, updated_at = NOW() WHERE key = 'version'`,
      [version.toString()],
    );
  }

  /**
   * 获取项目当前版本
   */
  async getProjectVersion(projectId: string): Promise<number> {
    const pool = await this.getProjectConfigPool(projectId);
    const result = await pool.query(
      `SELECT value FROM project_config WHERE key = 'version'`,
    );
    if (result.rows.length === 0) {
      return 1;
    }
    return parseInt(result.rows[0].value, 10);
  }

  /**
   * 确保数据库存在
   */
  private async ensureDatabaseExists(dbName: string): Promise<void> {
    const result = await this.mainPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (result.rows.length === 0) {
      await this.mainPool.query(`CREATE DATABASE "${dbName}"`);
      this.logger.log(`数据库创建成功: ${dbName}`);
    }
  }

  /**
   * 获取或创建项目数据库连接池
   */
  private async getOrCreatePool(dbName: string): Promise<Pool> {
    const existingPool = this.projectPools.get(dbName);
    if (existingPool) {
      return existingPool;
    }

    const dbConfig = this.configService.get('database');
    const pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbName,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.projectPools.set(dbName, pool);
    return pool;
  }

  /**
   * 关闭所有连接池
   */
  async onModuleDestroy() {
    await this.mainPool.end();
    for (const pool of this.projectPools.values()) {
      await pool.end();
    }
    this.projectPools.clear();
    this.logger.log('所有数据库连接池已关闭');
  }
}

