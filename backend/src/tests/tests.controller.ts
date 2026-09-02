import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { TestsService } from './tests.service';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { RequestTeacher } from '../common/types';
import { SaveTestDto, ShareDto } from './dto/tests.dto';

@Controller('tests')
export class TestsController {
  constructor(private readonly tests: TestsService) {}

  @Get()
  list(@CurrentTeacher() teacher: RequestTeacher) {
    return this.tests.list(teacher.id);
  }

  @Post()
  create(@CurrentTeacher() teacher: RequestTeacher, @Body() dto: SaveTestDto) {
    return this.tests.create(teacher.id, dto);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.tests.detail(id, teacher.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher, @Body() dto: SaveTestDto) {
    return this.tests.update(id, teacher.id, dto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.tests.setPublished(id, teacher.id, true);
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.tests.setPublished(id, teacher.id, false);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.tests.duplicate(id, teacher.id);
  }

  @Post(':id/share')
  share(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher, @Body() dto: ShareDto) {
    return this.tests.share(id, teacher.id, dto.teacherId, dto.canEdit ?? false);
  }

  @Delete(':id/share/:teacherId')
  unshare(
    @Param('id') id: string,
    @Param('teacherId') targetId: string,
    @CurrentTeacher() teacher: RequestTeacher,
  ) {
    return this.tests.unshare(id, teacher.id, targetId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.tests.remove(id, teacher.id);
  }
}
