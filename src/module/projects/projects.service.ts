import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { DatabaseManagerService } from '../../common/database/database-manager.service';
import { FieldType, getDbType } from './types/field-type.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private databaseManager: DatabaseManagerService,
    private dataSource: DataSource,
  ) { }

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    // 验证字段定义
    this.validateFieldDefinitions(createProjectDto.response_structure);

    // 创建项目记录
    const project = this.projectRepository.create({
      ...createProjectDto,
      version: 1,
    });
    const savedProject = await this.projectRepository.save(project);

    // 创建项目配置数据库
    await this.databaseManager.createProjectConfigDatabase(savedProject.id);

    // 创建项目数据数据库（版本1）
    await this.databaseManager.createProjectDataDatabase(
      savedProject.id,
      1,
    );
    // 转换 FieldType 为数据库类型
    const dbFieldDefinitions = createProjectDto.response_structure.map(
      (field) => ({
        ...field,
        type: getDbType(field.type as FieldType, field.length),
      }),
    );

    // 检查请求参数中 是否有需要保存到数据库的字段
    const requestParamsDbFieldDefinitions = createProjectDto.request_params.filter(param => param.saveToDatabase).map(param => ({
      key: param.key,
      type: param.type,
      nullable: param.required,
      default: param.default,
      unique: false,
      length: param.length,
    }));

    await this.databaseManager.createProjectDataTable(
      savedProject.id,
      1,
      [...dbFieldDefinitions, ...requestParamsDbFieldDefinitions],
    );

    return savedProject;
  }

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`项目 ID ${id} 不存在`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);

    // 检查是否修改了数据结构
    const structureChanged =
      updateProjectDto.response_structure &&
      JSON.stringify(updateProjectDto.response_structure) !==
      JSON.stringify(project.response_structure);

    if (structureChanged && updateProjectDto.response_structure) {
      // 验证新的字段定义
      this.validateFieldDefinitions(updateProjectDto.response_structure);

      // 版本递增
      const newVersion = project.version + 1;

      // 更新项目配置数据库中的版本号
      await this.databaseManager.updateProjectVersion(id, newVersion);

      // 创建新的数据存储数据库
      await this.databaseManager.createProjectDataDatabase(id, newVersion);
      if (updateProjectDto.response_structure) {
        // 转换 FieldType 为数据库类型
        const dbFieldDefinitions = updateProjectDto.response_structure.map(
          (field) => ({
            ...field,
            type: getDbType(field.type as FieldType, field.length),
          }),
        );
        await this.databaseManager.createProjectDataTable(
          id,
          newVersion,
          dbFieldDefinitions,
        );
      }

      // 更新项目信息
      Object.assign(project, {
        ...updateProjectDto,
        version: newVersion,
      });
    } else {
      // 只更新其他信息，不改变版本
      Object.assign(project, updateProjectDto);
    }

    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepository.remove(project);
    // 注意：这里可以选择删除相关的数据库，但为了安全，先保留
  }

  /**
   * 验证字段定义
   */
  private validateFieldDefinitions(
    structure: Array<{
      key: string;
      type: string;
      nullable?: boolean;
      primary?: boolean;
      default?: string;
      unique?: boolean;
    }>,
  ): void {
    if (!structure || structure.length === 0) {
      throw new BadRequestException('字段定义不能为空');
    }

    const keys = new Set<string>();
    let primaryCount = 0;

    for (const field of structure) {
      // 检查字段名是否重复
      if (keys.has(field.key)) {
        throw new BadRequestException(`字段名重复: ${field.key}`);
      }
      keys.add(field.key);

      // 检查字段名是否与系统字段冲突
      if (['id', 'project_id', 'version'].includes(field.key)) {
        throw new BadRequestException(
          `字段名 ${field.key} 与系统保留字段冲突`,
        );
      }

      // 检查主键
      if (field.primary) {
        primaryCount++;
        if (!field.nullable) {
          throw new BadRequestException(
            `主键字段 ${field.key} 必须允许为空或设置为可空`,
          );
        }
      }
    }

    // 验证类型是否为有效的 FieldType 枚举值
    const validTypes = Object.values(FieldType);
    for (const field of structure) {
      if (!validTypes.includes(field.type as FieldType)) {
        throw new BadRequestException(
          `字段 ${field.key} 的类型 ${field.type} 不被支持。支持的类型: ${validTypes.join(', ')}`,
        );
      }

      // 对于 select、checkbox、radio 类型，如果提供了 options，验证 options 不为空
      if (
        (field.type === FieldType.SELECT ||
          field.type === FieldType.CHECKBOX ||
          field.type === FieldType.RADIO) &&
        (field as any).options &&
        Array.isArray((field as any).options) &&
        (field as any).options.length === 0
      ) {
        throw new BadRequestException(
          `字段 ${field.key} 的类型为 ${field.type}，必须提供 options 选项列表`,
        );
      }
    }
  }
}

