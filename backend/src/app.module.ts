import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { TestsModule } from './tests/tests.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { WorksModule } from './works/works.module';
import { GradesModule } from './grades/grades.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FilesModule } from './files/files.module';
import { OcrModule } from './ocr/ocr.module';
import { HealthController } from './health/health.controller';
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    ClassesModule,
    TestsModule,
    AssignmentsModule,
    WorksModule,
    GradesModule,
    AnalyticsModule,
    FilesModule,
    OcrModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
