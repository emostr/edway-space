import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { AccountsModule } from './accounts/accounts.module';
import { BillingModule } from './billing/billing.module';
import { PlatformModule } from './platform/platform.module';
import { ClassesModule } from './classes/classes.module';
import { TestsModule } from './tests/tests.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { WorksModule } from './works/works.module';
import { GradesModule } from './grades/grades.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FilesModule } from './files/files.module';
import { OcrModule } from './ocr/ocr.module';
import { HealthController } from './health/health.controller';
import { BootstrapService } from './common/bootstrap.service';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SetupGuard } from './common/guards/setup.guard';
import { SubscriptionGuard } from './common/guards/subscription.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    SchoolsModule,
    AccountsModule,
    BillingModule,
    PlatformModule,
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
  providers: [
    BootstrapService,
    // Порядок важен: сначала выясняем, кто пришёл, затем его роль, затем
    // прошёл ли он обязательную настройку, и только потом — жива ли подписка.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SetupGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
  ],
})
export class AppModule {}
