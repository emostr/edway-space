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
    @CurrentTeacher() teacher: RequestTeacher,
    @Query('classId') classId?: string,
    @Query('testId') testId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.assignments.list(teacher.id, { classId, testId, from, to });
  }

  @Post()
  create(@Body() dto: CreateAssignmentDto, @CurrentTeacher() teacher: RequestTeacher) {
    return this.assignments.create(dto, teacher.id);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.assignments.detail(id, teacher.id);
  }

  @Get(':id/sheets')
  sheets(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.assignments.sheets(id, teacher.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTeacher() teacher: RequestTeacher,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignments.update(id, teacher.id, dto);
  }

  @Post(':id/works')
  addSpare(
    @Param('id') id: string,
    @CurrentTeacher() teacher: RequestTeacher,
    @Body('studentId') studentId?: string,
    @Body('variant') variant?: number,
  ) {
    return this.assignments.addSpare(id, teacher.id, studentId, variant);
  }

  @Patch(':id/works/:workId/variant')
  setVariant(
    @Param('id') id: string,
    @Param('workId') workId: string,
    @CurrentTeacher() teacher: RequestTeacher,
    @Body('variant') variant: number,
  ) {
    return this.assignments.setVariant(id, teacher.id, workId, variant);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.assignments.setClosed(id, teacher.id, true);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.assignments.setClosed(id, teacher.id, false);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.assignments.remove(id, teacher.id);
  }
}
