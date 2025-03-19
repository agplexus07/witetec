import { Module, forwardRef } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { WebhookSenderService } from './webhook-sender.service';

@Module({
  imports: [forwardRef(() => TransactionsModule)],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookSenderService],
  exports: [WebhooksService, WebhookSenderService],
})
export class WebhooksModule {}