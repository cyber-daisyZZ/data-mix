import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseManagerService } from './database-manager.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseManagerService],
  exports: [DatabaseManagerService],
})
export class DatabaseModule {}

