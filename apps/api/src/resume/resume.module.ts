import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, StorageModule, AiModule],
    controllers: [ResumeController],
    providers: [ResumeService],
    exports: [ResumeService],
})
export class ResumeModule { }
