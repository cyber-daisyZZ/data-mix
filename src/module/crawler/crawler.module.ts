import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CrawlerService } from './crawler.service';
import { CrawlerProcessor } from './crawler.processor';
import { DatabaseModule } from '../../common/database/database.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    HttpModule,
    DatabaseModule,
    TasksModule,
    ProjectsModule,
  ],
  providers: [CrawlerService, CrawlerProcessor],
  exports: [CrawlerService],
})
export class CrawlerModule {}

