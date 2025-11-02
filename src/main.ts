import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cors from '@fastify/cors';
import { AppModule } from './module/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // 配置 CORS - 允许全部
  await app.register(cors, {
    origin: true, // 允许所有来源
    credentials: true, // 允许携带凭证
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const configService = app.get(ConfigService);
  const appConfig = configService.get('app');

  // 设置全局前缀
  const globalPrefix = appConfig.globalPrefix;
  app.setGlobalPrefix(globalPrefix);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('数据爬取后台系统 API')
    .setDescription('基于 NestJS + Fastify 的动态数据爬取后台系统')
    .setVersion('1.0')
    .addTag('projects', '项目管理')
    .addTag('tasks', '任务管理')
    .addTag('query', '数据查询')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = appConfig.swaggerPath;
  SwaggerModule.setup(swaggerPath, app, document);

  const port = appConfig.port;
  await app.listen(port, '0.0.0.0');
  console.log(`应用运行在: http://localhost:${port}`);
  console.log(`API 前缀: /${globalPrefix}`);
  console.log(`Swagger 文档: http://localhost:${port}/${swaggerPath}`);
}
bootstrap();
