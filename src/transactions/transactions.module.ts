import { Module, forwardRef } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PixModule } from '../pix/pix.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    PixModule,
    ApiKeysModule,
    forwardRef(() => WebhooksModule)
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}