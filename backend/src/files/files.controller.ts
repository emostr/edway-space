import { BadRequestException, Controller, Get, Header, Param, Post, Req, Res } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator';
import { RequestTeacher } from '../common/types';

@Controller('files')
export class FilesController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  /** Загрузка картинки из визуального редактора: чертежи, графики, схемы. */
  @Post('images')
  async uploadImage(@Req() req: FastifyRequest, @CurrentTeacher() teacher: RequestTeacher) {
    const part = await req.file();
    if (!part) {
      throw new BadRequestException('Файл не передан');
    }
    const buffer = await part.toBuffer();
    const stored = await this.storage.saveImage(buffer, part.mimetype);
    await this.prisma.mediaFile.create({
      data: {
        file: stored.file,
        mime: stored.mime,
        width: stored.width,
        height: stored.height,
        size: stored.size,
        ownerId: teacher.id,
      },
    });
    return { url: `/api/files/${stored.file}`, width: stored.width, height: stored.height };
  }

  /**
   * Отдаём файл сами, а не через статику Caddy: каталог загрузок лежит в
   * приватном томе, и смотреть его должны только вошедшие учителя.
   */
  @Get('images/:name')
  @Header('Cache-Control', 'private, max-age=86400')
  image(@Param('name') name: string, @Res() reply: FastifyReply) {
    return this.send(`images/${name}`, reply);
  }

  @Get('scans/:name')
  @Header('Cache-Control', 'private, max-age=3600')
  scan(@Param('name') name: string, @Res() reply: FastifyReply) {
    return this.send(`scans/${name}`, reply);
  }

  private async send(file: string, reply: FastifyReply) {
    if (!(await this.storage.exists(file))) {
      return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'Файл не найден' });
    }
    const buffer = await this.storage.read(file);
    return reply
      .type(this.storage.extension(file) === '.webp' ? 'image/webp' : 'application/octet-stream')
      .header('ETag', this.storage.etag(file, buffer.length))
      .send(buffer);
  }
}
