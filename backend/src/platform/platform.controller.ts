import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSchoolDto, ExtendSchoolDto } from '../schools/dto/schools.dto';

@Controller('platform')
@Roles('PLATFORM_ADMIN')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('overview')
  overview() {
    return this.platform.overview();
  }

  @Get('schools')
  list(@Query('status') status?: string, @Query('search') search?: string) {
    return this.platform.list({ status, search });
  }

  @Post('schools')
  @HttpCode(201)
  create(@Body() dto: CreateSchoolDto) {
    return this.platform.createSchool(dto);
  }

  @Post('schools/:id/extend')
  @HttpCode(200)
  extend(@Param('id') id: string, @Body() dto: ExtendSchoolDto) {
    return this.platform.extend(id, dto);
  }

  @Post('schools/:id/block')
  @HttpCode(200)
  block(@Param('id') id: string) {
    return this.platform.setBlocked(id, true);
  }

  @Post('schools/:id/unblock')
  @HttpCode(200)
  unblock(@Param('id') id: string) {
    return this.platform.setBlocked(id, false);
  }

  @Post('schools/:id/admin-password')
  @HttpCode(200)
  resetAdmin(@Param('id') id: string) {
    return this.platform.resetAdminPassword(id);
  }

  @Delete('schools/:id')
  remove(@Param('id') id: string) {
    return this.platform.remove(id);
  }

  @Get('payments')
  payments() {
    return this.platform.payments();
  }
}
