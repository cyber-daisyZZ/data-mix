import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class TasksQueueService {
  constructor(
    @InjectQueue('crawler') private readonly crawlerQueue: Queue,
  ) {}

  async addTask(taskId: string): Promise<void> {
    await this.crawlerQueue.add('execute', { taskId });
  }
}

