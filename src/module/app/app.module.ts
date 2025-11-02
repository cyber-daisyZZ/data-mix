import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from '../../config/database.config';
import { DatabaseModule } from '../../common/database/database.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { QueryModule } from '../query/query.module';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    // TypeORM 配置（主数据库）
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [Project, Task],
          synchronize: false, // 已关闭，避免外键约束冲突。如需修改表结构，请使用迁移
          logging: false,
        };
      },
      inject: [ConfigService],
    }),
    // Bull 队列配置
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return {
          redis: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
          },
        };
      },
      inject: [ConfigService],
    }),
    // 业务模块
    DatabaseModule,
    ProjectsModule,
    TasksModule,
    CrawlerModule,
    QueryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

