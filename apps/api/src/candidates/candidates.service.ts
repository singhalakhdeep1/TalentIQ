import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import {
    CreateCandidateCommand,
    SubmitResumeCommand,
    UpdateCandidateStatusCommand,
    ScoreCandidateCommand,
    CandidateApplicationStatus,
} from './commands/candidate.commands';
import {
    GetCandidateQuery,
    ListCandidatesQuery,
    GetCandidateTimelineQuery,
} from './queries/candidate.queries';

export interface CreateCandidateDto {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    userId: string;
}

export interface ListCandidatesDto {
    status?: string;
    jobId?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface UploadResumeDto {
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    fileSizeBytes: number;
}

@Injectable()
export class CandidatesService {
    private readonly logger = new Logger(CandidatesService.name);

    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) { }

    async createCandidate(dto: CreateCandidateDto): Promise<{ id: string }> {
        const candidateId = uuidv4();
        const correlationId = uuidv4();

        await this.commandBus.execute(
            new CreateCandidateCommand(
                candidateId,
                dto.userId,
                {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email: dto.email,
                    phone: dto.phone,
                    linkedinUrl: dto.linkedinUrl,
                    portfolioUrl: dto.portfolioUrl,
                },
                correlationId,
            ),
        );

        return { id: candidateId };
    }

    async submitResume(candidateId: string, dto: UploadResumeDto): Promise<void> {
        await this.commandBus.execute(
            new SubmitResumeCommand(candidateId, dto, uuidv4()),
        );
    }

    async getCandidate(candidateId: string) {
        return this.queryBus.execute(new GetCandidateQuery(candidateId));
    }

    async listCandidates(dto: ListCandidatesDto) {
        return this.queryBus.execute(new ListCandidatesQuery(dto));
    }

    async getCandidateTimeline(candidateId: string) {
        return this.queryBus.execute(new GetCandidateTimelineQuery(candidateId));
    }

    async updateStatus(
        candidateId: string,
        applicationId: string,
        status: CandidateApplicationStatus,
        reason?: string,
        updatedById?: string,
    ): Promise<void> {
        await this.commandBus.execute(
            new UpdateCandidateStatusCommand(
                candidateId,
                applicationId,
                status,
                reason,
                updatedById,
                uuidv4(),
            ),
        );
    }

    async scoreCandidate(
        candidateId: string,
        jobId: string,
        scores: {
            resumeScore: number;
            skillsMatchScore: number;
            interviewScore?: number;
            overallScore: number;
        },
        aiJustification: string,
    ): Promise<void> {
        await this.commandBus.execute(
            new ScoreCandidateCommand(candidateId, jobId, scores, aiJustification, uuidv4()),
        );
    }
}
