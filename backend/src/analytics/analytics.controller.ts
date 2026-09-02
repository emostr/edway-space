import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { RequestTeacher } from '../common/types';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentTeacher() teacher: RequestTeacher) {
    return this.analytics.overview(teacher.id);
  }

  @Get('assignments/:id')
  assignment(@Param('id') id: string) {
    return this.analytics.assignmentReport(id);
  }
}
