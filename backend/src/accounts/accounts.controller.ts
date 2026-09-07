import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentAccount } from '../common/decorators/current-account.decorator';
import { RequestAccount } from '../common/types';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/accounts.dto';

@Controller('accounts')
@Roles('SCHOOL_ADMIN')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@CurrentAccount() account: RequestAccount) {
    return this.accounts.list(account.school?.id ?? '');
  }

  @Post()
  @HttpCode(201)
  create(@CurrentAccount() account: RequestAccount, @Body() dto: CreateTeacherDto) {
    return this.accounts.create(account.school?.id ?? '', dto);
  }

  @Patch(':id')
  update(
    @CurrentAccount() account: RequestAccount,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.accounts.update(account.school?.id ?? '', id, dto.fullName, dto.subject);
  }

  @Post(':id/password')
  @HttpCode(200)
  resetPassword(@CurrentAccount() account: RequestAccount, @Param('id') id: string) {
    return this.accounts.resetPassword(account.school?.id ?? '', id);
  }

  @Post(':id/totp-reset')
  @HttpCode(200)
  resetTotp(@CurrentAccount() account: RequestAccount, @Param('id') id: string) {
    return this.accounts.resetTotp(account.school?.id ?? '', id);
  }

  @Delete(':id')
  remove(@CurrentAccount() account: RequestAccount, @Param('id') id: string) {
    return this.accounts.remove({ id: account.school?.id ?? '' }, account, id);
  }
}
