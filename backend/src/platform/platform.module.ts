import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [SchoolsModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
