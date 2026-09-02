import { Controller, Get, Header, Query } from '@nestjs/common';
import { GradesService } from './grades.service';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { RequestTeacher } from '../common/types';

@Controller('grades')
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  @Get()
  journal(
    @CurrentTeacher() teacher: RequestTeacher,
    @Query('classId') classId?: string,
    @Query('testId') testId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.grades.journal(teacher.id, { classId, testId, assignmentId, from, to });
  }

  @Get('summary')
  summary(
    @CurrentTeacher() teacher: RequestTeacher,
    @Query('classId') classId?: string,
    @Query('testId') testId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.grades.summary(teacher.id, { classId, testId, assignmentId, from, to });
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="edway-grades.csv"')
  export(
    @CurrentTeacher() teacher: RequestTeacher,
    @Query('classId') classId?: string,
    @Query('testId') testId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.grades.csv(teacher.id, { classId, testId, assignmentId, from, to });
  }
}
