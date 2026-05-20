import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ScoreCandidateCommand } from '../candidates/commands/candidate.commands';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InterviewsService {
    private readonly logger = new Logger(InterviewsService.name);
    private readonly openai: OpenAI;
    private readonly aiServiceBaseUrl: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly http: HttpService,
        private readonly aiService: AiService,
        private readonly commandBus: CommandBus,
    ) {
        this.openai = new OpenAI({ apiKey: config.get<string>('openai.apiKey') });
        this.aiServiceBaseUrl = config.get<string>('aiService.url', 'http://ai-service:8000');
    }

    // ─── Get AI-generated opening question for a job ──────────────────────────
    async getOpeningQuestion(jobId: string): Promise<string> {
        const job = await this.prisma.job.findUniqueOrThrow({
            where: { id: jobId },
            select: { title: true, description: true, requirements: true },
        });

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a professional technical interviewer. Ask a single, open-ended opening question relevant to the role. Keep it concise (2 sentences max).',
                },
                {
                    role: 'user',
                    content: `Role: ${job.title}\nDescription: ${job.description}\nRequirements: ${job.requirements}`,
                },
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        return completion.choices[0].message.content ?? 'Tell me about yourself and why you are interested in this role.';
    }

    // ─── Get AI follow-up based on candidate answer ──────────────────────────
    async getFollowUpQuestion(
        jobId: string,
        previousAnswer: string,
        questionIndex: number,
    ): Promise<string | null> {
        // Stop after 5 questions
        if (questionIndex >= 4) return null;

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a professional interviewer. Based on the candidate answer, ask ONE precise follow-up question. If no follow-up is needed, return exactly "DONE".',
                },
                {
                    role: 'user',
                    content: `Candidate answered: "${previousAnswer}"\n\nQuestion ${questionIndex + 1} of 5 asked so far.`,
                },
            ],
            max_tokens: 100,
            temperature: 0.6,
        });

        const response = completion.choices[0].message.content?.trim();
        return response === 'DONE' ? null : (response ?? null);
    }

    // ─── Transcribe audio chunk via Whisper ───────────────────────────────────
    async transcribeAudioChunk(audioBuffer: Buffer, mimeType: string): Promise<string> {
        const formData = new FormData();
        const ext = mimeType.includes('webm') ? 'webm' : 'wav';
        formData.append('file', new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
        formData.append('model', 'whisper-1');

        try {
            const { data } = await firstValueFrom(
                this.http.post<{ text: string }>(
                    'https://api.openai.com/v1/audio/transcriptions',
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${this.config.get<string>('openai.apiKey')}`,
                        },
                    },
                ),
            );
            return data.text;
        } catch (err: any) {
            this.logger.warn(`Whisper transcription failed: ${err.message}`);
            return '';
        }
    }

    // ─── Finalize session — score + persist ───────────────────────────────────
    async finalizeSession(
        interviewId: string,
        candidateId: string,
        jobId: string,
        transcript: string,
        startedAt: Date,
        reason: 'COMPLETED' | 'ABANDONED' | 'ERROR',
    ): Promise<void> {
        const endedAt = new Date();
        const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

        // Persist transcript
        await this.prisma.voiceSession.upsert({
            where: { interviewId },
            update: { transcript, endedAt, durationSeconds, status: reason },
            create: {
                id: uuidv4(),
                interviewId,
                candidateId,
                jobId,
                transcript,
                startedAt,
                endedAt,
                durationSeconds,
                status: reason,
            },
        });

        if (reason === 'COMPLETED' && transcript.length > 50) {
            // Run AI analysis on transcript
            const job = await this.prisma.job.findUniqueOrThrow({
                where: { id: jobId },
                select: { description: true, title: true },
            });

            const analysis = await this.aiService.analyzeVoiceInterview(
                interviewId,
                transcript,
                `${job.title}: ${job.description}`,
            );

            // Persist analysis
            await this.prisma.voiceSession.update({
                where: { interviewId },
                data: { analysisResult: analysis as any, aiScore: analysis.score },
            });

            // Update candidate scores via CQRS
            const existing = await this.prisma.candidateScore.findUnique({
                where: { candidateId_jobId: { candidateId, jobId } },
            });

            const resumeScore = existing?.resumeScore ?? 50;
            const skillsMatchScore = existing?.skillsMatchScore ?? 50;
            const overallScore = Math.round(
                resumeScore * 0.35 + skillsMatchScore * 0.35 + analysis.score * 0.3,
            );

            await this.commandBus.execute(
                new ScoreCandidateCommand(
                    candidateId,
                    jobId,
                    { resumeScore, skillsMatchScore, interviewScore: analysis.score, overallScore },
                    analysis.summary,
                    uuidv4(),
                ),
            );

            this.logger.log(
                `Interview analysis complete for ${interviewId}: score=${analysis.score}, recommendation=${analysis.recommendation}`,
            );
        }
    }
}
