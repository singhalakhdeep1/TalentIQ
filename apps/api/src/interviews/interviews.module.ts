import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { InterviewGateway } from './interview.gateway';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [CqrsModule, HttpModule, AiModule],
    controllers: [InterviewsController],
    providers: [InterviewGateway, InterviewsService],
    exports: [InterviewsService],
})
export class InterviewsModule { }
