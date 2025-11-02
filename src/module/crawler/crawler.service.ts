import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DatabaseManagerService } from '../../common/database/database-manager.service';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskStatus } from '../tasks/entities/task.entity';
import { createHash } from 'crypto';
import { mergeRequestParams } from '../projects/utils/request-params.util';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly databaseManager: DatabaseManagerService,
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
  ) {}

  async executeTask(taskId: string): Promise<void> {
    const task = await this.tasksService.findOne(taskId);
    const project = await this.projectsService.findOne(task.project_id);

    try {
      // 更新任务状态为运行中
      await this.tasksService.updateStatus(taskId, TaskStatus.RUNNING);

      this.logger.log(`开始执行任务 ${taskId}，项目: ${project.name}`);

      // 合并项目配置和任务的具体请求参数
      const mergedParams = mergeRequestParams(
        project.request_params,
        task.request_params,
      );

      // 发起HTTP请求
      const requestConfig = {
        method: project.method,
        url: project.api_url,
        ...(project.method === 'GET'
          ? { params: mergedParams }
          : { data: mergedParams }),
      };

      const response = await firstValueFrom(
        this.httpService.request(requestConfig),
      );

      // 提取数据（这里假设返回的是数组或对象，需要根据实际情况调整）
      let dataList = this.extractDataList(response.data);

      if (dataList.length === 0) {
        this.logger.warn(`任务 ${taskId} 未获取到数据`);
        await this.tasksService.updateStatus(
          taskId,
          TaskStatus.COMPLETED,
          0,
        );
        return;
      }

      // 数据去重
      const uniqueData = await this.deduplicateData(
        task.project_id,
        task.version,
        dataList,
        project.response_structure,
      );

      // 保存数据
      await this.saveData(
        task.project_id,
        task.version,
        uniqueData,
      );

      // 更新任务状态
      await this.tasksService.updateStatus(
        taskId,
        TaskStatus.COMPLETED,
        uniqueData.length,
      );

      this.logger.log(
        `任务 ${taskId} 完成，保存了 ${uniqueData.length} 条数据`,
      );
    } catch (error) {
      this.logger.error(`任务 ${taskId} 执行失败: ${error.message}`, error.stack);
      await this.tasksService.updateStatus(
        taskId,
        TaskStatus.FAILED,
        undefined,
        error.message,
      );
      throw error;
    }
  }

  /**
   * 从响应数据中提取数据列表
   */
  private extractDataList(responseData: any): any[] {
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData?.data) {
      if (Array.isArray(responseData.data)) {
        return responseData.data;
      }
      if (responseData.data?.list) {
        return Array.isArray(responseData.data.list)
          ? responseData.data.list
          : [responseData.data.list];
      }
    }
    if (responseData?.list) {
      return Array.isArray(responseData.list)
        ? responseData.list
        : [responseData.list];
    }
    // 如果是单个对象，转换为数组
    if (typeof responseData === 'object' && responseData !== null) {
      return [responseData];
    }
    return [];
  }

  /**
   * 数据去重
   */
  private async deduplicateData(
    projectId: string,
    version: number,
    dataList: any[],
    responseStructure: Array<{
      key: string;
      type: string;
      nullable?: boolean;
      primary?: boolean;
      default?: string;
      unique?: boolean;
    }>,
  ): Promise<any[]> {
    const pool = await this.databaseManager.getProjectDataPool(
      projectId,
      version,
    );

    // 找出主键字段（用于去重）
    const primaryFields = responseStructure
      .filter((f) => f.primary)
      .map((f) => f.key);

    const uniqueDataMap = new Map<string, any>();

    for (const data of dataList) {
      // 如果没有主键字段，使用所有字段生成哈希
      if (primaryFields.length === 0) {
        const hashString = JSON.stringify(data);
        const hash = createHash('sha256').update(hashString).digest('hex');

        // 检查数据库中是否已存在
        const existing = await pool.query(
          'SELECT id FROM crawl_data WHERE normalized_data::text = $1',
          [hashString],
        );

        if (existing.rows.length === 0) {
          uniqueDataMap.set(hash, data);
        }
      } else {
        // 使用主键字段检查
        const checkConditions = primaryFields
          .map((field, idx) => `"${field}" = $${idx + 1}`)
          .join(' AND ');

        const values = primaryFields.map((field) => data[field] ?? null);

        // 检查是否有空值（如果主键字段有空值，不进行去重检查，直接添加）
        if (values.some((v) => v === null || v === undefined)) {
          const uniqueKey = primaryFields
            .map((field) => `${field}:${data[field] || ''}`)
            .join('|');
          uniqueDataMap.set(uniqueKey, data);
          continue;
        }

        const existing = await pool.query(
          `SELECT id FROM crawl_data WHERE ${checkConditions}`,
          values,
        );

        if (existing.rows.length === 0) {
          // 生成唯一键
          const uniqueKey = primaryFields
            .map((field) => `${field}:${data[field] || ''}`)
            .join('|');
          uniqueDataMap.set(uniqueKey, data);
        }
      }
    }

    return Array.from(uniqueDataMap.values());
  }

  /**
   * 保存数据到数据库
   */
  private async saveData(
    projectId: string,
    version: number,
    dataList: any[],
  ): Promise<void> {
    if (dataList.length === 0) {
      return;
    }

    const pool = await this.databaseManager.getProjectDataPool(
      projectId,
      version,
    );

    // 批量插入（每批100条）
    const batchSize = 100;
    for (let i = 0; i < dataList.length; i += batchSize) {
      const batch = dataList.slice(i, i + batchSize);
      await this.insertBatch(pool, projectId, version, batch);
    }
  }

  /**
   * 批量插入数据
   */
  private async insertBatch(
    pool: any,
    projectId: string,
    version: number,
    batch: any[],
  ): Promise<void> {
    if (batch.length === 0) {
      return;
    }

    // 获取第一个数据的字段作为模板
    const firstData = batch[0];
    const dynamicFields: string[] = ['project_id', 'version'];
    const keys = Object.keys(firstData);
    dynamicFields.push(...keys.map((k) => `"${k}"`));

    // 构建批量插入SQL
    const valueParts: string[] = [];
    const allValues: any[] = [];
    let paramIndex = 1;

    for (const data of batch) {
      const values: string[] = [];
      values.push(`$${paramIndex++}`); // project_id
      allValues.push(projectId);
      values.push(`$${paramIndex++}`); // version
      allValues.push(version);

      for (const key of keys) {
        values.push(`$${paramIndex++}`);
        allValues.push(data[key] ?? null);
      }

      valueParts.push(`(${values.join(', ')})`);
    }

    const insertSQL = `
      INSERT INTO crawl_data (${dynamicFields.join(', ')})
      VALUES ${valueParts.join(', ')}
    `;

    try {
      await pool.query(insertSQL, allValues);
    } catch (error) {
      this.logger.error(
        `批量保存数据失败: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

