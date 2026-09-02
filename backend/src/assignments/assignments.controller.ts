import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { RequestTeacher } from '../common/types';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignments.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get()
  list(
    @Query('classId') classId?: string,
    @Query('testId') testId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.assignments.list({ classId, testId, from, to });
  }

  @Post()
  create(@Body() dto: CreateAssignmentDto, @CurrentTeacher() teacher: RequestTeacher) {
    return this.assignments.create(dto, teacher.id);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.assignments.detail(id);
  }

  @Get(':id/sheets')
  sheets(@Param('id') id: string) {
    return this.assignments.sheets(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignments.update(id, dto);
  }

  @Post(':id/works')
  addSpare(@Param('id') id: string, @Body('studentId') studentId?: string) {
    return this.assignments.addSpare(id, studentId);
  }

  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.assignments.setClosed(id, true);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string) {
    return this.assignments.setClosed(id, false);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assignments.remove(id);
  }
}
