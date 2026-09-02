import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { RequestTeacher } from '../common/types';
import { CreateClassDto, PromoteClassDto, ReplaceStudentsDto, UpdateStudentDto } from './dto/classes.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  list(@Query('archived') archived?: string) {
    return this.classes.list(archived === 'true');
  }

  @Post()
  create(@Body() dto: CreateClassDto, @CurrentTeacher() teacher: RequestTeacher) {
    return this.classes.create(dto, teacher.id);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.classes.detail(id);
  }

  @Post(':id/students')
  replaceStudents(@Param('id') id: string, @Body() dto: ReplaceStudentsDto) {
    return this.classes.replaceStudents(id, dto.students);
  }

  @Patch('students/:studentId')
  updateStudent(@Param('studentId') studentId: string, @Body() dto: UpdateStudentDto) {
    return this.classes.updateStudent(studentId, dto.lastName, dto.firstName);
  }

  @Delete('students/:studentId')
  removeStudent(@Param('studentId') studentId: string) {
    return this.classes.removeStudent(studentId);
  }

  @Post(':id/promote')
  promote(@Param('id') id: string, @Body() dto: PromoteClassDto) {
    return this.classes.promote(id, dto.number, dto.letter);
  }

  @Post('promote-all')
  promoteAll() {
    return this.classes.promoteAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classes.remove(id);
  }
}
