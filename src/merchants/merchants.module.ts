import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}