import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStoreService } from '../../event-store/event-store.service';
import { AiService } from '../../ai/ai.service';
import {
    CreateCandidateCommand,
    SubmitResumeCommand,
    UpdateCandidateStatusCommand,
    ScoreCandidateCommand,
    CANDIDATE_AGGREGATE_TYPE,
} from './candidate.commands';
import { AggregateType } from '../../event-store/interfaces/stored-event.interface';
import { v4 as uuidv4 } from 'uuid';

// ─── CreateCandidate Handler ──────────────────────────────────────────────

@Injectable()
@CommandHandler(CreateCandidateCommand)
export class CreateCandidateHandler implements ICommandHandler<CreateCandidateCommand> {
    private readonly logger = new Logger(CreateCandidateHandler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventStore: EventStoreService,
    ) { }

    async execute(command: CreateCandidateCommand): Promise<void> {
        const { candidateId, userId, data, correlationId } = command;

        // Guard: check email uniqueness
        const existing = await this.prisma.candidate.findUnique({
            where: { email: data.email },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException(`Candidate with email ${data.email} already exists`);
        }

        // Persist aggregate (projection table for fast reads)
        await this.prisma.candidate.create({
            data: {
                id: candidateId,
                userId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                linkedinUrl: data.linkedinUrl,
                portfolioUrl: data.portfolioUrl,
                status: 'ACTIVE',
            },
        });

        // Append domain event to event store
        await this.eventStore.append(
            candidateId,
            AggregateType.CANDIDATE,
            'CandidateCreated',
            { userId, ...data },
            { correlationId, userId },
            0, // expectedVersion = 0 (new aggregate)
        );

        this.logger.log(`Candidate created: ${candidateId} (${data.email})`);
    }
}

// ─── SubmitResume Handler ─────────────────────────────────────────────────

@Injectable()
@CommandHandler(SubmitResumeCommand)
export class SubmitResumeHandler implements ICommandHandler<SubmitResumeCommand> {
    private readonly logger = new Logger(SubmitResumeHandler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventStore: EventStoreService,
        private readonly aiService: AiService,
    ) { }

    async execute(command: SubmitResumeCommand): Promise<void> {
        const { candidateId, resumeData, correlationId } = command;

        const currentVersion = await this.eventStore.getCurrentVersion(candidateId);

        // Update projection
        await this.prisma.candidate.update({
            where: { id: candidateId },
            data: {
                resumeStorageKey: resumeData.storageKey,
                resumeFileName: resumeData.originalFileName,
                resumeUploadedAt: new Date(),
            },
        });

        // Async: trigger AI resume parsing + embedding generation
        // (fire-and-forget — event driven via Kafka)
        setImmediate(() => {
            this.aiService.parseAndEmbedResume(candidateId, resumeData.storageKey).catch((err) =>
                this.logger.error(`Resume embedding failed for ${candidateId}: ${err.message}`),
            );
        });

        await this.eventStore.append(
            candidateId,
            AggregateType.CANDIDATE,
            'ResumeSubmitted',
            resumeData,
            { correlationId },
            currentVersion,
        );

        this.logger.log(`Resume submitted for candidate: ${candidateId}`);
    }
}

// ─── UpdateCandidateStatus Handler ───────────────────────────────────────

@Injectable()
@CommandHandler(UpdateCandidateStatusCommand)
export class UpdateCandidateStatusHandler implements ICommandHandler<UpdateCandidateStatusCommand> {
    private readonly logger = new Logger(UpdateCandidateStatusHandler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventStore: EventStoreService,
    ) { }

    async execute(command: UpdateCandidateStatusCommand): Promise<void> {
        const { candidateId, applicationId, newStatus, reason, updatedById, correlationId } = command;

        const currentVersion = await this.eventStore.getCurrentVersion(candidateId);

        await this.prisma.application.update({
            where: { id: applicationId },
            data: {
                status: newStatus,
                statusUpdatedAt: new Date(),
                statusReason: reason,
            },
        });

        await this.eventStore.append(
            candidateId,
            AggregateType.CANDIDATE,
            'CandidateStatusUpdated',
            { applicationId, newStatus, reason, updatedById },
            { correlationId: correlationId ?? uuidv4(), userId: updatedById },
            currentVersion,
        );

        this.logger.log(`Candidate ${candidateId} status updated to ${newStatus}`);
    }
}

// ─── ScoreCandidate Handler ───────────────────────────────────────────────

@Injectable()
@CommandHandler(ScoreCandidateCommand)
export class ScoreCandidateHandler implements ICommandHandler<ScoreCandidateCommand> {
    private readonly logger = new Logger(ScoreCandidateHandler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventStore: EventStoreService,
    ) { }

    async execute(command: ScoreCandidateCommand): Promise<void> {
        const { candidateId, jobId, scores, aiJustification, correlationId } = command;

        const currentVersion = await this.eventStore.getCurrentVersion(candidateId);

        // Upsert the AI score for this candidate+job pair
        await this.prisma.candidateScore.upsert({
            where: { candidateId_jobId: { candidateId, jobId } },
            update: { ...scores, aiJustification, scoredAt: new Date() },
            create: {
                id: uuidv4(),
                candidateId,
                jobId,
                ...scores,
                aiJustification,
                scoredAt: new Date(),
            },
        });

        await this.eventStore.append(
            candidateId,
            AggregateType.CANDIDATE,
            'CandidateScored',
            { jobId, scores, aiJustification },
            { correlationId },
            currentVersion,
        );

        this.logger.log(
            `Candidate ${candidateId} scored for job ${jobId}: overall=${scores.overallScore}`,
        );
    }
}

export const CandidateCommandHandlers = [
    CreateCandidateHandler,
    SubmitResumeHandler,
    UpdateCandidateStatusHandler,
    ScoreCandidateHandler,
];
