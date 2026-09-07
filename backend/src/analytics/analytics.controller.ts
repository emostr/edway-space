import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentAccount } from '../common/decorators/current-account.decorator';
import { RequestAccount } from '../common/types';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentAccount() account: RequestAccount) {
    return this.analytics.overview(account.school?.id ?? '', account.id);
  }

  @Get('assignments/:id')
  assignment(@Param('id') id: string, @CurrentAccount() account: RequestAccount) {
    return this.analytics.assignmentReport(id, account.school?.id ?? '', account.id);
  }
}
