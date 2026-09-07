import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { Public } from '../common/decorators/public.decorator';
import { AllowExpired } from '../common/decorators/allow-expired.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentAccount } from '../common/decorators/current-account.decorator';
import { RequestAccount } from '../common/types';
import { RegisterSchoolDto, UpdateSchoolDto } from './dto/schools.dto';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  /** Регистрация школы с сайта: две недели знакомства без оплаты. */
  @Public()
  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterSchoolDto) {
    return this.schools.register(dto);
  }

  /** Карточка своей школы — она же страница подписки. */
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @AllowExpired()
  @Get('mine')
  mine(@CurrentAccount() account: RequestAccount) {
    return this.schools.detail(account.school?.id ?? '');
  }

  @Roles('SCHOOL_ADMIN')
  @AllowExpired()
  @Patch('mine')
  update(@CurrentAccount() account: RequestAccount, @Body() dto: UpdateSchoolDto) {
    return this.schools.update(account.school?.id ?? '', dto);
  }
}
