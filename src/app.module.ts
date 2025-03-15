import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MerchantsModule } from './merchants/merchants.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    MerchantsModule,
    AuthModule,
    TransactionsModule,
    WithdrawalsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}