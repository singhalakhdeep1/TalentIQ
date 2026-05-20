import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CqrsModule } from '@nestjs/cqrs';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { EventStoreModule } from './event-store/event-store.module';
import { AuthModule } from './auth/auth.module';
import { CandidatesModule } from './candidates/candidates.module';
import { JobsModule } from './jobs/jobs.module';
import { InterviewsModule } from './interviews/interviews.module';
import { ResumeModule } from './resume/resume.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SkillsGraphModule } from './skills-graph/skills-graph.module';
import { CredentialsModule } from './credentials/credentials.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { KafkaModule } from './kafka/kafka.module';
import { StorageModule } from './storage/storage.module';

@Module({
    imports: [
        // Config
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),

        // Rate limiting
        ThrottlerModule.forRoot([
            { name: 'short', ttl: 1000, limit: 20 },
            { name: 'medium', ttl: 10000, limit: 100 },
            { name: 'long', ttl: 60000, limit: 500 },
        ]),

        // Event system
        EventEmitterModule.forRoot({ wildcard: true }),
        ScheduleModule.forRoot(),
        CqrsModule.forRoot(),

        // Infrastructure
        PrismaModule,
        EventStoreModule,
        KafkaModule,
        StorageModule,

        // Domain modules
        AuthModule,
        CandidatesModule,
        JobsModule,
        InterviewsModule,
        ResumeModule,
        AiModule,
        AnalyticsModule,
        SkillsGraphModule,
        CredentialsModule,

        // Observability
        HealthModule,
        MetricsModule,
    ],
})
export class AppModule { }
