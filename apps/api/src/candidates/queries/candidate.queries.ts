import { Injectable, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Queries ──────────────────────────────────────────────────────────────

export class GetCandidateQuery {
    constructor(public readonly candidateId: string) { }
}

export class ListCandidatesQuery {
    constructor(
        public readonly filters: {
            status?: string;
            jobId?: string;
            search?: string;
            page?: number;
            limit?: number;
        },
    ) { }
}

export class GetCandidateTimelineQuery {
    constructor(public readonly candidateId: string) { }
}

export class SearchCandidatesByEmbeddingQuery {
    constructor(
        public readonly jobId: string,
        public readonly limit: number = 20,
        public readonly threshold: number = 0.7,
    ) { }
}

// ─── Query Handlers ───────────────────────────────────────────────────────

@Injectable()
@QueryHandler(GetCandidateQuery)
export class GetCandidateHandler implements IQueryHandler<GetCandidateQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetCandidateQuery) {
        return this.prisma.candidate.findUniqueOrThrow({
            where: { id: query.candidateId },
            include: {
                applications: {
                    include: { job: true, interviews: true, scores: true },
                    orderBy: { appliedAt: 'desc' },
                },
                voiceSessions: {
                    orderBy: { startedAt: 'desc' },
                    take: 5,
                },
            },
        });
    }
}

@Injectable()
@QueryHandler(ListCandidatesQuery)
export class ListCandidatesHandler implements IQueryHandler<ListCandidatesQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: ListCandidatesQuery) {
        const { filters } = query;
        const page = filters.page ?? 1;
        const limit = Math.min(filters.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (filters.status) where.status = filters.status;
        if (filters.search) {
            where.OR = [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [candidates, total] = await Promise.all([
            this.prisma.candidate.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    applications: {
                        where: filters.jobId ? { jobId: filters.jobId } : undefined,
                        include: { job: { select: { title: true, department: true } }, scores: true },
                        orderBy: { appliedAt: 'desc' },
                        take: 1,
                    },
                },
            }),
            this.prisma.candidate.count({ where }),
        ]);

        return {
            data: candidates,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
}

@Injectable()
@QueryHandler(GetCandidateTimelineQuery)
export class GetCandidateTimelineHandler implements IQueryHandler<GetCandidateTimelineQuery> {
    private readonly logger = new Logger(GetCandidateTimelineHandler.name);

    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetCandidateTimelineQuery) {
        // Rebuild full event history for this candidate from the event store
        const events = await this.prisma.domainEvent.findMany({
            where: { aggregateId: query.candidateId },
            orderBy: { occurredAt: 'asc' },
        });

        return events.map((e) => ({
            eventId: e.id,
            type: e.eventType,
            version: e.eventVersion,
            payload: e.payload,
            occurredAt: e.occurredAt,
        }));
    }
}

export const CandidateQueryHandlers = [
    GetCandidateHandler,
    ListCandidatesHandler,
    GetCandidateTimelineHandler,
];
