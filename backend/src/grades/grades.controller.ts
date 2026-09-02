import { Controller, Get, Header, Query } from '@nestjs/common';
import { GradesService } from './grades.service';

@Controller('grades')
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  @Get()
  journal(
    @Query('classId') classId?: string,
    @Query('testId') testId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.grades.journal({ classId, testId, assignmentId, from, to });
  }

  @Get('summary')
  summary(
    @Query('classId') classId?: string,
    @Query('testId') testId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.grades.summary({ classId, testId, assignmentId, from, to });
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="edway-grades.csv"')
  export(
    @Query('classId') classId?: string,
    @Query('testId') testId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.grades.csv({ classId, testId, assignmentId, from, to });
  }
}
