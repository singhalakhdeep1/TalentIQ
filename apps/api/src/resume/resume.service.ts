import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ResumeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly aiService: AiService,
    ) { }

    async getResumeDownloadUrl(candidateId: string): Promise<{ url: string; fileName: string }> {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            select: { resumeStorageKey: true, resumeFileName: true },
        });

        if (!candidate?.resumeStorageKey) {
            throw new NotFoundException('Resume not found for candidate');
        }

        const url = await this.storage.getPresignedUrl(candidate.resumeStorageKey, 1800);
        return {
            url,
            fileName: candidate.resumeFileName ?? 'resume.pdf',
        };
    }

    async reprocessResume(candidateId: string): Promise<{ status: 'queued' }> {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            select: { resumeStorageKey: true },
        });

        if (!candidate?.resumeStorageKey) {
            throw new NotFoundException('Resume not found for candidate');
        }

        await this.aiService.parseAndEmbedResume(candidateId, candidate.resumeStorageKey);

        return { status: 'queued' };
    }

    async getResumeInsights(candidateId: string): Promise<unknown> {
        const embedding = await this.prisma.candidateEmbedding.findUnique({
            where: { candidateId },
            select: {
                parsedData: true,
                model: true,
                updatedAt: true,
            },
        });

        if (!embedding) {
            throw new NotFoundException('No parsed resume data found');
        }

        return embedding;
    }
}
