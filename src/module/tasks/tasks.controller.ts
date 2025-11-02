import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: '创建爬取任务（自动加入队列）' })
  @ApiResponse({ status: 201, description: '任务创建成功并已加入队列' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '项目不存在' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目ID（可选，用于筛选）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query('projectId') projectId?: string) {
    return this.tasksService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }
}

