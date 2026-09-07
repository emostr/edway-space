import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { YooKassaClient } from './yookassa';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [SchoolsModule],
  controllers: [BillingController],
  providers: [BillingService, YooKassaClient],
  exports: [BillingService],
})
export class BillingModule {}
