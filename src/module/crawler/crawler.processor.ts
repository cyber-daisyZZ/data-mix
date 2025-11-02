import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { CrawlerService } from './crawler.service';
import { Logger } from '@nestjs/common';

@Processor('crawler')
export class CrawlerProcessor {
  private readonly logger = new Logger(CrawlerProcessor.name);

  constructor(private readonly crawlerService: CrawlerService) {}

  @Process('execute')
  async handleCrawlerTask(job: Job<{ taskId: string }>) {
    this.logger.log(`处理爬取任务: ${job.data.taskId}`);
    try {
      await this.crawlerService.executeTask(job.data.taskId);
      this.logger.log(`爬取任务完成: ${job.data.taskId}`);
    } catch (error) {
      this.logger.error(
        `爬取任务失败: ${job.data.taskId}, ${error.message}`,
      );
      throw error;
    }
  }
}

