import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { WorksService } from './works.service';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { RequestTeacher } from '../common/types';
import { AssignStudentDto, AttachPageDto, UpdateAnswerDto } from './dto/works.dto';

@Controller()
export class WorksController {
  constructor(private readonly works: WorksService) {}

  /** Пачка сканов одного назначения: листы сами разбираются по ученикам. */
  @Post('assignments/:id/scans')
  async upload(@Param('id') id: string, @Req() req: FastifyRequest) {
    const parts = req.files();
    const files: { buffer: Buffer; mimetype: string }[] = [];
    for await (const part of parts) {
      files.push({ buffer: await part.toBuffer(), mimetype: part.mimetype });
    }
    if (!files.length) {
      throw new BadRequestException('Не передано ни одного файла');
    }
    return this.works.upload(id, files);
  }

  @Get('works/:id')
  detail(@Param('id') id: string) {
    return this.works.detail(id);
  }

  @Patch('works/:id/answers')
  updateAnswer(@Param('id') id: string, @Body() dto: UpdateAnswerDto) {
    return this.works.updateAnswer(id, dto);
  }

  @Post('works/:id/finalize')
  finalize(@Param('id') id: string, @CurrentTeacher() teacher: RequestTeacher) {
    return this.works.finalize(id, teacher.id);
  }

  @Post('works/:id/reopen')
  reopen(@Param('id') id: string) {
    return this.works.reopen(id);
  }

  @Patch('works/:id/student')
  assignStudent(@Param('id') id: string, @Body() dto: AssignStudentDto) {
    return this.works.assignStudent(id, dto.studentId, dto.studentName);
  }

  @Post('works/:id/pages')
  attach(@Param('id') id: string, @Body() dto: AttachPageDto) {
    return this.works.attachExisting(id, dto.file, dto.pageIndex ?? 0);
  }

  @Delete('works/:id/pages/:pageId')
  removePage(@Param('id') id: string, @Param('pageId') pageId: string) {
    return this.works.removePage(id, pageId);
  }

  @Post('works/:id/reset')
  reset(@Param('id') id: string) {
    return this.works.reset(id);
  }
}
