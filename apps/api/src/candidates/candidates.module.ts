import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MulterModule } from '@nestjs/platform-express';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidateCommandHandlers } from './commands/candidate.handlers';
import { CandidateQueryHandlers } from './queries/candidate.queries';
import { StorageModule } from '../storage/storage.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [
        CqrsModule,
        MulterModule.register({ storage: undefined }), // memory storage — stream to MinIO
        StorageModule,
        AiModule,
    ],
    controllers: [CandidatesController],
    providers: [
        CandidatesService,
        ...CandidateCommandHandlers,
        ...CandidateQueryHandlers,
    ],
    exports: [CandidatesService],
})
export class CandidatesModule { }
