import { Module } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixMonitorService } from './pix-monitor.service';

@Module({
  providers: [PixService, PixMonitorService],
  exports: [PixService],
})
export class PixModule {}