import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './module/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

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
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`应用运行在: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger 文档: http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
