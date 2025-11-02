import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseManagerService } from '../../common/database/database-manager.service';
import { ProjectsService } from '../projects/projects.service';
import { QueryDataDto } from './dto/query-data.dto';

@Injectable()
export class QueryService {
  constructor(
    private readonly databaseManager: DatabaseManagerService,
    private readonly projectsService: ProjectsService,
  ) {}

  async queryProjectData(queryDto: QueryDataDto): Promise<{
    data: any[];
    total: number;
    version: number;
  }> {
    // 验证项目存在
    const project = await this.projectsService.findOne(queryDto.projectId);

    // 确定查询版本（如果未指定，使用项目当前版本）
    const version = queryDto.version || project.version;

    // 获取对应的数据库连接池
    const pool = await this.databaseManager.getProjectDataPool(
      queryDto.projectId,
      version,
    );

    // 构建查询条件
    let countSQL = 'SELECT COUNT(*) as total FROM crawl_data WHERE 1=1';
    let dataSQL = 'SELECT * FROM crawl_data WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // 版本筛选
    dataSQL += ` AND version = $${paramIndex}`;
    countSQL += ` AND version = $${paramIndex}`;
    params.push(version);
    paramIndex++;

    // 项目ID筛选
    dataSQL += ` AND project_id = $${paramIndex}`;
    countSQL += ` AND project_id = $${paramIndex}`;
    params.push(queryDto.projectId);
    paramIndex++;

    // 动态字段筛选
    if (queryDto.filters && queryDto.filters.length > 0) {
      for (const filter of queryDto.filters) {
        const operatorMap = {
          '=': '=',
          '!=': '!=',
          '>': '>',
          '<': '<',
          '>=': '>=',
          '<=': '<=',
          LIKE: 'LIKE',
          IN: 'IN',
        };

        const operator = operatorMap[filter.operator] || '=';

        if (filter.operator === 'IN') {
          if (!filter.values || filter.values.length === 0) {
            throw new BadRequestException(
              `字段 ${filter.field} 的 IN 操作符需要提供 values 数组`,
            );
          }
          const placeholders = filter.values
            .map((_: any, idx: number) => `$${paramIndex + idx}`)
            .join(', ');
          const condition = `"${filter.field}" ${operator} (${placeholders})`;
          dataSQL += ` AND ${condition}`;
          countSQL += ` AND ${condition}`;
          params.push(...filter.values);
          paramIndex += filter.values.length;
        } else if (filter.operator === 'LIKE') {
          const condition = `"${filter.field}" ${operator} $${paramIndex}`;
          dataSQL += ` AND ${condition}`;
          countSQL += ` AND ${condition}`;
          params.push(`%${filter.value}%`);
          paramIndex++;
        } else {
          if (filter.value === undefined || filter.value === null) {
            throw new BadRequestException(
              `字段 ${filter.field} 的 ${filter.operator} 操作符需要提供 value`,
            );
          }
          const condition = `"${filter.field}" ${operator} $${paramIndex}`;
          dataSQL += ` AND ${condition}`;
          countSQL += ` AND ${condition}`;
          params.push(filter.value);
          paramIndex++;
        }
      }
    }

    // 排序
    if (queryDto.orderBy) {
      dataSQL += ` ORDER BY "${queryDto.orderBy}"`;
      if (queryDto.order) {
        dataSQL += ` ${queryDto.order}`;
      } else {
        dataSQL += ' ASC';
      }
    } else {
      // 如果没有指定排序，使用id降序
      dataSQL += ' ORDER BY id DESC';
    }

    // 分页
    if (queryDto.limit) {
      dataSQL += ` LIMIT $${paramIndex}`;
      params.push(queryDto.limit);
      paramIndex++;
      if (queryDto.offset) {
        dataSQL += ` OFFSET $${paramIndex}`;
        params.push(queryDto.offset);
      }
    }

    // 执行查询
    try {
      const [dataResult, countResult] = await Promise.all([
        pool.query(dataSQL, params),
        pool.query(countSQL, params),
      ]);

      return {
        data: dataResult.rows,
        total: parseInt(countResult.rows[0].total, 10),
        version,
      };
    } catch (error) {
      throw new BadRequestException(
        `查询失败: ${error.message}`,
      );
    }
  }

  /**
   * 获取项目所有可用版本
   */
  async getProjectVersions(projectId: string): Promise<number[]> {
    const project = await this.projectsService.findOne(projectId);
    const versions: number[] = [];
    
    // 检查每个版本的数据数据库是否存在
    for (let v = 1; v <= project.version; v++) {
      const dbName = `project_${projectId}_data_v${v}`;
      const mainPool = this.databaseManager.getMainPool();
      const result = await mainPool.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName],
      );
      
      if (result.rows.length > 0) {
        versions.push(v);
      }
    }
    
    return versions;
  }
}

