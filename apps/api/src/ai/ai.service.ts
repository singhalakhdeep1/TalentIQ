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

export interface ScreeningOutcome {
    scores: { resumeScore: number; skillsMatchScore: number; overallScore: number };
    justification: string;
    recommendation?: 'ADVANCE' | 'HOLD' | 'REJECT';
}

export interface RecruiterBrief {
    candidateId: string;
    jobId: string;
    fitScore: number;
    recommendation: 'ADVANCE' | 'HOLD' | 'REJECT';
    summary: string;
    strengths: string[];
    concerns: string[];
    evidence: {
        matchedSkills: string[];
        missingSkills: string[];
        niceToHaveSignals: string[];
        yearsExperience: number;
        latestInterviewScore: number | null;
    };
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
    ): Promise<ScreeningOutcome> {
        try {
            const { data } = await firstValueFrom(
                this.http.post<ScreeningOutcome>(`${this.aiServiceBaseUrl}/screen`, { candidateId, jobId }),
            );
            return data;
        } catch (error: any) {
            this.logger.warn(`Screening agent fallback used for ${candidateId}/${jobId}: ${error.message}`);
            return this.buildFallbackScreening(candidateId, jobId);
        }
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
        if (!this.config.get<string>('openai.apiKey')) {
            return this.buildFallbackInterviewAnalysis(transcriptText, jobDescription);
        }

        try {
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
        } catch (error: any) {
            this.logger.warn(`Voice interview fallback used for ${interviewId}: ${error.message}`);
            return this.buildFallbackInterviewAnalysis(transcriptText, jobDescription);
        }
    }

    async generateRecruiterBrief(candidateId: string, jobId: string): Promise<RecruiterBrief> {
        const [candidate, job] = await Promise.all([
            this.prisma.candidate.findUniqueOrThrow({
                where: { id: candidateId },
                include: {
                    embedding: true,
                    scores: {
                        where: { jobId },
                        orderBy: { scoredAt: 'desc' },
                        take: 1,
                    },
                    voiceSessions: {
                        where: { jobId },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            }),
            this.prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
        ]);

        const parsedResume = this.readParsedResume(candidate.embedding?.parsedData);
        const skillAssessment = this.assessSkillFit(parsedResume?.skills ?? [], job.requiredSkills, job.niceToHaveSkills);
        const yearsExperience = parsedResume?.totalYearsExperience ?? 0;
        const latestScore = candidate.scores[0];
        const interviewScore = candidate.voiceSessions[0]?.aiScore ?? null;
        const fitScore = latestScore?.overallScore ?? this.estimateOverallFit(skillAssessment.matchRatio, yearsExperience, interviewScore);
        const recommendation = this.recommendFromScore(fitScore);
        const strengths = [
            ...skillAssessment.matchedSkills.slice(0, 4).map((skill) => `Matches required skill: ${skill}`),
            ...(yearsExperience >= 5 ? [`Demonstrates ${yearsExperience}+ years of relevant experience.`] : []),
            ...(interviewScore && interviewScore >= 75 ? [`Recent voice interview scored ${interviewScore}/100.`] : []),
        ].slice(0, 5);
        const concerns = [
            ...skillAssessment.missingSkills.slice(0, 4).map((skill) => `Missing or unverified skill: ${skill}`),
            ...(interviewScore !== null && interviewScore < 65 ? [`Interview score is below bar at ${interviewScore}/100.`] : []),
            ...(yearsExperience < 3 ? ['Limited tenure signal for the seniority implied by the role.'] : []),
        ].slice(0, 5);

        return {
            candidateId,
            jobId,
            fitScore,
            recommendation,
            summary: `${candidate.firstName} ${candidate.lastName} is a ${recommendation.toLowerCase()} candidate for ${job.title}. ${skillAssessment.matchedSkills.length} required skills matched, ${skillAssessment.missingSkills.length} remain unverified.`,
            strengths,
            concerns,
            evidence: {
                matchedSkills: skillAssessment.matchedSkills,
                missingSkills: skillAssessment.missingSkills,
                niceToHaveSignals: skillAssessment.niceToHaveSignals,
                yearsExperience,
                latestInterviewScore: interviewScore,
            },
        };
    }

    // ─── Utility ─────────────────────────────────────────────────────────────

    private async buildFallbackScreening(candidateId: string, jobId: string): Promise<ScreeningOutcome> {
        const [candidate, job] = await Promise.all([
            this.prisma.candidate.findUniqueOrThrow({
                where: { id: candidateId },
                include: { embedding: true },
            }),
            this.prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
        ]);

        const parsedResume = this.readParsedResume(candidate.embedding?.parsedData);
        const skillAssessment = this.assessSkillFit(parsedResume?.skills ?? [], job.requiredSkills, job.niceToHaveSkills);
        const resumeScore = this.scoreResume(parsedResume, job);
        const skillsMatchScore = Math.round(skillAssessment.matchRatio * 100);
        const overallScore = Math.round(resumeScore * 0.55 + skillsMatchScore * 0.45);

        return {
            scores: { resumeScore, skillsMatchScore, overallScore },
            justification: [
                `Matched required skills: ${skillAssessment.matchedSkills.join(', ') || 'none identified'}.`,
                skillAssessment.missingSkills.length > 0
                    ? `Unverified skills: ${skillAssessment.missingSkills.join(', ')}.`
                    : 'All required skills were observed in the parsed resume.',
                `Estimated experience: ${parsedResume?.totalYearsExperience ?? 0} years.`,
            ].join(' '),
            recommendation: this.recommendFromScore(overallScore),
        };
    }

    private buildFallbackInterviewAnalysis(
        transcriptText: string,
        jobDescription: string,
    ): {
        score: number;
        strengths: string[];
        concerns: string[];
        recommendation: 'ADVANCE' | 'HOLD' | 'REJECT';
        summary: string;
    } {
        const normalizedTranscript = transcriptText.toLowerCase();
        const fillerMatches = normalizedTranscript.match(/\b(um|uh|like|you know|basically)\b/g) ?? [];
        const jobKeywords = this.normalizeTerms(jobDescription).slice(0, 18);
        const transcriptKeywords = new Set(this.normalizeTerms(transcriptText));
        const matchedKeywords = jobKeywords.filter((term) => transcriptKeywords.has(term));
        const detailScore = Math.min(35, Math.round(transcriptText.length / 20));
        const domainScore = Math.min(35, matchedKeywords.length * 5);
        const clarityPenalty = Math.min(20, fillerMatches.length * 2);
        const score = this.clamp(detailScore + domainScore + 20 - clarityPenalty, 20, 95);
        const recommendation = this.recommendFromScore(score);

        return {
            score,
            strengths: [
                matchedKeywords.length > 0
                    ? `Referenced role-relevant topics: ${matchedKeywords.slice(0, 4).join(', ')}.`
                    : 'Provided some relevant interview context.',
                transcriptText.length > 400 ? 'Delivered answers with enough detail for evaluation.' : 'Concise answers kept responses focused.',
            ],
            concerns: [
                ...(fillerMatches.length > 6 ? ['Frequent filler language may reduce communication clarity.'] : []),
                ...(matchedKeywords.length < 3 ? ['Few role-specific concepts were explicitly covered.'] : []),
                ...(transcriptText.length < 250 ? ['Transcript is short and may underrepresent the candidate.'] : []),
            ],
            recommendation,
            summary: `Fallback interview analysis scored the conversation at ${score}/100 based on response depth, role-keyword coverage, and communication clarity.`,
        };
    }

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

    private readParsedResume(value: unknown): ParsedResume | null {
        if (!value || typeof value !== 'object') return null;
        const candidate = value as Partial<ParsedResume>;

        if (!Array.isArray(candidate.skills) || typeof candidate.summary !== 'string') {
            return null;
        }

        return {
            name: typeof candidate.name === 'string' ? candidate.name : '',
            email: typeof candidate.email === 'string' ? candidate.email : '',
            phone: typeof candidate.phone === 'string' ? candidate.phone : undefined,
            summary: candidate.summary,
            skills: candidate.skills.filter((item): item is string => typeof item === 'string'),
            experience: Array.isArray(candidate.experience) ? candidate.experience as ParsedResume['experience'] : [],
            education: Array.isArray(candidate.education) ? candidate.education as ParsedResume['education'] : [],
            certifications: Array.isArray(candidate.certifications)
                ? candidate.certifications.filter((item): item is string => typeof item === 'string')
                : [],
            totalYearsExperience: typeof candidate.totalYearsExperience === 'number' ? candidate.totalYearsExperience : 0,
        };
    }

    private assessSkillFit(candidateSkills: string[], requiredSkills: string[], niceToHaveSkills: string[]) {
        const normalizedCandidateSkills = new Set(candidateSkills.map((skill) => skill.toLowerCase().trim()));
        const matchedSkills = requiredSkills.filter((skill) => normalizedCandidateSkills.has(skill.toLowerCase().trim()));
        const missingSkills = requiredSkills.filter((skill) => !normalizedCandidateSkills.has(skill.toLowerCase().trim()));
        const niceToHaveSignals = niceToHaveSkills.filter((skill) => normalizedCandidateSkills.has(skill.toLowerCase().trim()));
        const matchRatio = requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 0.5;

        return { matchedSkills, missingSkills, niceToHaveSignals, matchRatio };
    }

    private scoreResume(parsedResume: ParsedResume | null, job: { title: string; description: string; requirements: string }) {
        if (!parsedResume) return 35;

        const requirementTerms = new Set(this.normalizeTerms(`${job.title} ${job.description} ${job.requirements}`));
        const resumeTerms = new Set(this.normalizeTerms(this.buildResumeText(parsedResume)));
        const keywordHits = Array.from(requirementTerms).filter((term) => resumeTerms.has(term)).length;
        const keywordScore = Math.min(40, keywordHits * 3);
        const experienceScore = Math.min(35, Math.round(parsedResume.totalYearsExperience * 5));
        const certificationBonus = Math.min(10, parsedResume.certifications.length * 2);
        return this.clamp(20 + keywordScore + experienceScore + certificationBonus, 25, 95);
    }

    private estimateOverallFit(matchRatio: number, yearsExperience: number, interviewScore: number | null) {
        const base = matchRatio * 55 + Math.min(yearsExperience * 5, 25);
        const interviewContribution = interviewScore !== null ? interviewScore * 0.2 : 10;
        return this.clamp(Math.round(base + interviewContribution), 20, 96);
    }

    private normalizeTerms(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9+#.\s-]/g, ' ')
            .split(/\s+/)
            .filter((term) => term.length >= 3);
    }

    private recommendFromScore(score: number): 'ADVANCE' | 'HOLD' | 'REJECT' {
        if (score >= 80) return 'ADVANCE';
        if (score >= 60) return 'HOLD';
        return 'REJECT';
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }
}
