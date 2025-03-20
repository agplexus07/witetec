import { Module, forwardRef } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { WebhookSenderService } from './webhook-sender.service';
import { OnzWebhookController } from './onz-webhook.controller';

@Module({
  imports: [forwardRef(() => TransactionsModule)],
  controllers: [WebhooksController, OnzWebhookController],
  providers: [WebhooksService, WebhookSenderService],
  exports: [WebhooksService, WebhookSenderService],
})
export class WebhooksModule {}