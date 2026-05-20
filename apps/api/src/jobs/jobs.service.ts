import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateJobDto {
    organizationId: string;
    title: string;
    department: string;
    location: string;
    workType: 'REMOTE' | 'HYBRID' | 'ONSITE';
    description: string;
    requirements: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    requiredSkills: string[];
    niceToHaveSkills?: string[];
    createdById: string;
}

@Injectable()
export class JobsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) { }

    async createJob(dto: CreateJobDto) {
        const job = await this.prisma.job.create({
            data: {
                id: uuidv4(),
                organizationId: dto.organizationId,
                title: dto.title,
                department: dto.department,
                location: dto.location,
                workType: dto.workType,
                description: dto.description,
                requirements: dto.requirements,
                salaryMin: dto.salaryMin,
                salaryMax: dto.salaryMax,
                salaryCurrency: dto.salaryCurrency ?? 'USD',
                requiredSkills: dto.requiredSkills,
                niceToHaveSkills: dto.niceToHaveSkills ?? [],
                status: 'OPEN',
                createdById: dto.createdById,
            },
        });

        // Fire-and-forget: embed job description for semantic search
        setImmediate(() =>
            this.aiService
                .embedJobDescription(job.id, `${dto.title} ${dto.description} ${dto.requirements}`)
                .catch((err) => console.error('Job embedding failed:', err)),
        );

        return job;
    }

    async getJob(jobId: string) {
        return this.prisma.job.findUniqueOrThrow({
            where: { id: jobId },
            include: {
                applications: { include: { candidate: true, scores: true } },
                _count: { select: { applications: true } },
            },
        });
    }

    async listJobs(filters: {
        organizationId?: string;
        status?: string;
        department?: string;
        workType?: string;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page ?? 1;
        const limit = Math.min(filters.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (filters.organizationId) where.organizationId = filters.organizationId;
        if (filters.status) where.status = filters.status;
        if (filters.department) where.department = filters.department;
        if (filters.workType) where.workType = filters.workType;

        const [jobs, total] = await Promise.all([
            this.prisma.job.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { applications: true } } },
            }),
            this.prisma.job.count({ where }),
        ]);

        return {
            data: jobs,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async applyToJob(candidateId: string, jobId: string): Promise<{ applicationId: string }> {
        // Guard: no duplicate applications
        const existing = await this.prisma.application.findFirst({
            where: { candidateId, jobId },
        });
        if (existing) return { applicationId: existing.id };

        const application = await this.prisma.application.create({
            data: {
                id: uuidv4(),
                candidateId,
                jobId,
                status: 'APPLIED',
                appliedAt: new Date(),
            },
        });

        return { applicationId: application.id };
    }

    async closeJob(jobId: string): Promise<void> {
        await this.prisma.job.update({ where: { id: jobId }, data: { status: 'CLOSED' } });
    }
}
