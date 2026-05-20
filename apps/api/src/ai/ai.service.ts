import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface ParsedResume {
    name: string;
    email: string;
    phone?: string;
    summary: string;
    skills: string[];
    experience: Array<{
        company: string;
        title: string;
        startDate: string;
        endDate?: string;
        description: string;
    }>;
    education: Array<{
        institution: string;
        degree: string;
        field: string;
        graduationYear?: number;
    }>;
    certifications: string[];
    totalYearsExperience: number;
}

export interface JobDescriptionEmbedding {
    jobId: string;
    embedding: number[];
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly openai: OpenAI;
    private readonly aiServiceBaseUrl: string;

    constructor(
        private readonly config: ConfigService,
        private readonly http: HttpService,
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
    ) {
        this.openai = new OpenAI({ apiKey: this.config.get<string>('openai.apiKey') });
        this.aiServiceBaseUrl = this.config.get<string>('aiService.url', 'http://ai-service:8000');
    }

    // ─── Resume Parsing + Embedding ──────────────────────────────────────────

    async parseAndEmbedResume(candidateId: string, storageKey: string): Promise<void> {
        try {
            // 1. Download resume file from MinIO
            const fileBuffer = await this.storage.getObject(storageKey);

            // 2. Call FastAPI AI service to parse resume using GPT-4 + pdfplumber
            const formData = new FormData();
            const blob = new Blob([fileBuffer], { type: 'application/pdf' });
            formData.append('file', blob, storageKey.split('/').pop() ?? 'resume.pdf');
            formData.append('candidate_id', candidateId);

            const { data: parsed } = await firstValueFrom(
                this.http.post<ParsedResume>(`${this.aiServiceBaseUrl}/parse-resume`, formData),
            );

            // 3. Generate text embedding via FastAPI (uses text-embedding-3-large)
            const { data: embeddingResult } = await firstValueFrom(
                this.http.post<{ embedding: number[]; model: string }>(
                    `${this.aiServiceBaseUrl}/embed`,
                    { text: this.buildResumeText(parsed) },
                ),
            );

            // 4. Store structured data + embedding in Prisma (pgvector)
            await this.prisma.$executeRaw`
        INSERT INTO "CandidateEmbedding" (id, "candidateId", embedding, model, "parsedData", "createdAt")
        VALUES (
          gen_random_uuid(),
          ${candidateId},
          ${JSON.stringify(embeddingResult.embedding)}::vector,
          ${embeddingResult.model},
          ${JSON.stringify(parsed)}::jsonb,
          NOW()
        )
        ON CONFLICT ("candidateId")
        DO UPDATE SET
          embedding = EXCLUDED.embedding,
          model = EXCLUDED.model,
          "parsedData" = EXCLUDED."parsedData",
          "updatedAt" = NOW()
      `;

            this.logger.log(`Resume parsed + embedded for candidate ${candidateId}`);
        } catch (err: any) {
            this.logger.error(`Failed to parse/embed resume for ${candidateId}: ${err.message}`);
            throw err;
        }
    }

    // ─── Job Description Embedding ────────────────────────────────────────────

    async embedJobDescription(jobId: string, description: string): Promise<void> {
        const { data } = await firstValueFrom(
            this.http.post<{ embedding: number[] }>(`${this.aiServiceBaseUrl}/embed`, {
                text: description,
            }),
        );

        await this.prisma.$executeRaw`
      INSERT INTO "JobEmbedding" (id, "jobId", embedding, "createdAt")
      VALUES (gen_random_uuid(), ${jobId}, ${JSON.stringify(data.embedding)}::vector, NOW())
      ON CONFLICT ("jobId")
      DO UPDATE SET embedding = EXCLUDED.embedding, "updatedAt" = NOW()
    `;
    }

    // ─── Semantic Candidate Search ────────────────────────────────────────────

    async findSimilarCandidates(
        jobId: string,
        limit = 20,
        threshold = 0.7,
    ): Promise<Array<{ candidateId: string; similarity: number }>> {
        const results = await this.prisma.$queryRaw<
            Array<{ candidateId: string; similarity: number }>
        >`
      SELECT ce."candidateId", 1 - (ce.embedding <=> je.embedding) AS similarity
      FROM "CandidateEmbedding" ce
      CROSS JOIN "JobEmbedding" je
      WHERE je."jobId" = ${jobId}
        AND 1 - (ce.embedding <=> je.embedding) >= ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

        return results;
    }

    // ─── LangGraph Screening Agent ────────────────────────────────────────────

    async runScreeningAgent(
        candidateId: string,
        jobId: string,
    ): Promise<{ scores: { resumeScore: number; skillsMatchScore: number; overallScore: number }; justification: string }> {
        const { data } = await firstValueFrom(
            this.http.post<{
                scores: { resumeScore: number; skillsMatchScore: number; overallScore: number };
                justification: string;
            }>(`${this.aiServiceBaseUrl}/screen`, { candidateId, jobId }),
        );
        return data;
    }

    // ─── Voice Interview Analysis ─────────────────────────────────────────────

    async analyzeVoiceInterview(
        interviewId: string,
        transcriptText: string,
        jobDescription: string,
    ): Promise<{
        score: number;
        strengths: string[];
        concerns: string[];
        recommendation: 'ADVANCE' | 'HOLD' | 'REJECT';
        summary: string;
    }> {
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are an expert technical interviewer. Analyze the interview transcript and provide a structured assessment. Respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: `Job Description:\n${jobDescription}\n\nInterview Transcript:\n${transcriptText}\n\nProvide JSON: { score: 0-100, strengths: [], concerns: [], recommendation: "ADVANCE"|"HOLD"|"REJECT", summary: "" }`,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });

        return JSON.parse(completion.choices[0].message.content ?? '{}');
    }

    // ─── Utility ─────────────────────────────────────────────────────────────

    private buildResumeText(parsed: ParsedResume): string {
        const exp = parsed.experience
            .map((e) => `${e.title} at ${e.company}: ${e.description}`)
            .join('\n');
        const edu = parsed.education
            .map((e) => `${e.degree} in ${e.field} from ${e.institution}`)
            .join('\n');
        return [
            `Skills: ${parsed.skills.join(', ')}`,
            `Summary: ${parsed.summary}`,
            `Experience:\n${exp}`,
            `Education:\n${edu}`,
        ].join('\n\n');
    }
}
