import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PixModule } from '../pix/pix.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [
    PixModule,
    ApiKeysModule // Importando o módulo de API Keys
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}