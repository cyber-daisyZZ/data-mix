import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksQueueService } from './tasks-queue.service';
import { Task } from './entities/task.entity';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({
      name: 'crawler',
    }),
    ProjectsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksQueueService],
  exports: [TasksService],
})
export class TasksModule {}

