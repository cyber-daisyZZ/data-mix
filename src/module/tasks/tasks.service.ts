import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { ProjectsService } from '../projects/projects.service';
import { TasksQueueService } from './tasks-queue.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private projectsService: ProjectsService,
    private tasksQueueService: TasksQueueService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // 验证项目存在并获取当前版本
    const project = await this.projectsService.findOne(createTaskDto.project_id);

    const task = this.taskRepository.create({
      project_id: createTaskDto.project_id,
      request_params: createTaskDto.request_params || [],
      version: project.version,
      status: TaskStatus.PENDING,
    });

    const savedTask = await this.taskRepository.save(task);

    // 自动将任务加入队列
    await this.tasksQueueService.addTask(savedTask.id);

    return savedTask;
  }

  async findAll(projectId?: string): Promise<Task[]> {
    const where = projectId ? { project_id: projectId } : {};
    return this.taskRepository.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['project'],
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!task) {
      throw new NotFoundException(`任务 ID ${id} 不存在`);
    }
    return task;
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    resultCount?: number,
    errorMessage?: string,
  ): Promise<Task> {
    const task = await this.findOne(id);
    task.status = status;
    
    if (status === TaskStatus.RUNNING && !task.started_at) {
      task.started_at = new Date();
    }
    
    if (
      status === TaskStatus.COMPLETED ||
      status === TaskStatus.FAILED
    ) {
      task.completed_at = new Date();
    }
    
    if (resultCount !== undefined) {
      task.result_count = resultCount;
    }
    
    if (errorMessage) {
      task.error_message = errorMessage;
    }

    return this.taskRepository.save(task);
  }
}

