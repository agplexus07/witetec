import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [ApiKeysModule, TransactionsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}