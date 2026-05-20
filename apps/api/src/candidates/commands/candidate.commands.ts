import { AggregateType } from '../../event-store/interfaces/stored-event.interface';

// ─── Commands ─────────────────────────────────────────────────────────────

export class CreateCandidateCommand {
    constructor(
        public readonly candidateId: string,
        public readonly userId: string,
        public readonly data: {
            firstName: string;
            lastName: string;
            email: string;
            phone?: string;
            linkedinUrl?: string;
            portfolioUrl?: string;
        },
        public readonly correlationId: string,
    ) { }
}

export class SubmitResumeCommand {
    constructor(
        public readonly candidateId: string,
        public readonly resumeData: {
            storageKey: string;
            originalFileName: string;
            mimeType: string;
            fileSizeBytes: number;
        },
        public readonly correlationId: string,
    ) { }
}

export class UpdateCandidateStatusCommand {
    constructor(
        public readonly candidateId: string,
        public readonly applicationId: string,
        public readonly newStatus: CandidateApplicationStatus,
        public readonly reason?: string,
        public readonly updatedById?: string,
        public readonly correlationId?: string,
    ) { }
}

export class ScheduleInterviewCommand {
    constructor(
        public readonly candidateId: string,
        public readonly interviewId: string,
        public readonly jobId: string,
        public readonly scheduledAt: Date,
        public readonly interviewType: 'VOICE' | 'VIDEO' | 'TECHNICAL' | 'HR',
        public readonly correlationId: string,
    ) { }
}

export class ScoreCandidateCommand {
    constructor(
        public readonly candidateId: string,
        public readonly jobId: string,
        public readonly scores: {
            resumeScore: number;       // 0–100, from pgvector cosine similarity
            skillsMatchScore: number;  // 0–100, from Neo4j skills graph
            interviewScore?: number;   // 0–100, from voice analysis
            overallScore: number;      // weighted average
        },
        public readonly aiJustification: string,
        public readonly correlationId: string,
    ) { }
}

// ─── Events ───────────────────────────────────────────────────────────────

export enum CandidateApplicationStatus {
    APPLIED = 'APPLIED',
    SCREENING = 'SCREENING',
    INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
    INTERVIEW_COMPLETED = 'INTERVIEW_COMPLETED',
    SHORTLISTED = 'SHORTLISTED',
    OFFER_EXTENDED = 'OFFER_EXTENDED',
    HIRED = 'HIRED',
    REJECTED = 'REJECTED',
    WITHDRAWN = 'WITHDRAWN',
}

export const CANDIDATE_AGGREGATE_TYPE = AggregateType.CANDIDATE;
