import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CurrentAccount } from '../common/decorators/current-account.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestAccount } from '../common/types';
import { CreateClassDto, PromoteClassDto, ReplaceStudentsDto, UpdateStudentDto } from './dto/classes.dto';

@Controller('classes')
@Roles('SCHOOL_ADMIN', 'TEACHER')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  /** Школа берётся из сессии: чужие классы недостижимы даже по прямой ссылке. */
  private school(account: RequestAccount): string {
    return account.school?.id ?? '';
  }

  @Get()
  list(@CurrentAccount() account: RequestAccount, @Query('archived') archived?: string) {
    return this.classes.list(this.school(account), archived === 'true');
  }

  @Post()
  create(@CurrentAccount() account: RequestAccount, @Body() dto: CreateClassDto) {
    return this.classes.create(this.school(account), dto, account.id);
  }

  @Get(':id')
  detail(@CurrentAccount() account: RequestAccount, @Param('id') id: string) {
    return this.classes.detail(this.school(account), id);
  }

  @Post(':id/students')
  replaceStudents(
    @CurrentAccount() account: RequestAccount,
    @Param('id') id: string,
    @Body() dto: ReplaceStudentsDto,
  ) {
    return this.classes.replaceStudents(this.school(account), id, dto.students);
  }

  @Patch('students/:studentId')
  updateStudent(
    @CurrentAccount() account: RequestAccount,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.classes.updateStudent(this.school(account), studentId, dto.lastName, dto.firstName);
  }

  @Delete('students/:studentId')
  removeStudent(@CurrentAccount() account: RequestAccount, @Param('studentId') studentId: string) {
    return this.classes.removeStudent(this.school(account), studentId);
  }

  @Post('promote-all')
  promoteAll(@CurrentAccount() account: RequestAccount) {
    return this.classes.promoteAll(this.school(account));
  }

  @Post(':id/promote')
  promote(
    @CurrentAccount() account: RequestAccount,
    @Param('id') id: string,
    @Body() dto: PromoteClassDto,
  ) {
    return this.classes.promote(this.school(account), id, dto.number, dto.letter);
  }

  @Delete(':id')
  remove(@CurrentAccount() account: RequestAccount, @Param('id') id: string) {
    return this.classes.remove(this.school(account), id);
  }
}
