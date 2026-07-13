/**
 * AI简历匹配服务
 * 使用AI进行简历与职位的智能匹配
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { OpenAI } from 'openai';

@Injectable()
export class AiMatchingService {
  private readonly logger = new Logger(AiMatchingService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 匹配候选人与职位
   */
  async matchCandidateToJob(candidateId: string, jobId: string): Promise<MatchResult> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { embedding: true },
    });

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!candidate || !job) {
      throw new Error('Candidate or job not found');
    }

    // 获取候选人的嵌入向量
    const candidateEmbedding = candidate.embedding?.embedding;
    if (!candidateEmbedding) {
      throw new Error('Candidate embedding not found. Please parse resume first.');
    }

    // 获取职位的嵌入向量
    const jobEmbedding = job.embedding;
    if (!jobEmbedding) {
      throw new Error('Job embedding not found. Please generate job embedding first.');
    }

    // 计算相似度
    const similarity = this.calculateCosineSimilarity(candidateEmbedding, jobEmbedding);

    // 使用AI进行详细分析
    const detailedAnalysis = await this.analyzeMatch(candidate, job, similarity);

    // 保存匹配结果
    await this.prisma.jobMatch.create({
      data: {
        candidateId,
        jobId,
        similarityScore: similarity,
        analysis: detailedAnalysis,
        status: similarity > 0.7 ? 'high_match' : similarity > 0.5 ? 'medium_match' : 'low_match',
      },
    });

    this.logger.log(`Matched candidate ${candidateId} to job ${jobId}: ${similarity.toFixed(2)}`);

    return {
      candidateId,
      jobId,
      similarityScore: similarity,
      matchLevel: similarity > 0.7 ? 'high' : similarity > 0.5 ? 'medium' : 'low',
      analysis: detailedAnalysis,
    };
  }

  /**
   * 为职位查找最佳匹配的候选人
   */
  async findBestMatchesForJob(jobId: string, limit: number = 10): Promise<MatchResult[]> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || !job.embedding) {
      throw new Error('Job not found or no embedding available');
    }

    // 获取所有有嵌入向量的候选人
    const candidates = await this.prisma.candidate.findMany({
      where: {
        embedding: {
          embedding: { not: null },
        },
      },
      include: { embedding: true },
    });

    // 计算每个候选人的相似度
    const matches = candidates.map(candidate => {
      const similarity = this.calculateCosineSimilarity(
        candidate.embedding.embedding,
        job.embedding,
      );

      return {
        candidateId: candidate.id,
        jobId,
        similarityScore: similarity,
        matchLevel: similarity > 0.7 ? 'high' : similarity > 0.5 ? 'medium' : 'low',
      };
    });

    // 按相似度排序并返回前N个
    return matches
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  /**
   * 为候选人查找最佳匹配的职位
   */
  async findBestJobsForCandidate(candidateId: string, limit: number = 10): Promise<MatchResult[]> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { embedding: true },
    });

    if (!candidate || !candidate.embedding || !candidate.embedding.embedding) {
      throw new Error('Candidate not found or no embedding available');
    }

    // 获取所有有嵌入向量的职位
    const jobs = await this.prisma.job.findMany({
      where: {
        embedding: { not: null },
      },
    });

    // 计算每个职位的相似度
    const matches = jobs.map(job => {
      const similarity = this.calculateCosineSimilarity(
        candidate.embedding.embedding,
        job.embedding,
      );

      return {
        candidateId,
        jobId: job.id,
        similarityScore: similarity,
        matchLevel: similarity > 0.7 ? 'high' : similarity > 0.5 ? 'medium' : 'low',
      };
    });

    // 按相似度排序并返回前N个
    return matches
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  /**
   * 计算余弦相似度
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * 使用AI分析匹配详情
   */
  private async analyzeMatch(
    candidate: any,
    job: any,
    similarity: number,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert recruiter. Analyze the match between a candidate and a job.
            Provide a detailed analysis including:
            - Key skills that match
            - Missing skills
            - Overall fit assessment
            - Interview recommendations
            
            Keep the response concise but informative (max 200 words).`,
          },
          {
            role: 'user',
            content: `Job: ${job.title}\nDescription: ${job.description}\nRequirements: ${job.requirements}\n\nCandidate: ${candidate.name}\nParsed Resume: ${JSON.stringify(candidate.embedding?.parsedData || {})}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return response.choices[0].message.content || 'No analysis available';
    } catch (error) {
      this.logger.error('AI analysis failed:', error);
      return 'Analysis unavailable due to AI service error';
    }
  }

  /**
   * 批量匹配
   */
  async batchMatch(jobId: string, candidateIds: string[]): Promise<MatchResult[]> {
    const results = await Promise.all(
      candidateIds.map(candidateId =>
        this.matchCandidateToJob(candidateId, jobId),
      ),
    );

    return results;
  }

  /**
   * 获取匹配历史
   */
  async getMatchHistory(candidateId?: string, jobId?: string): Promise<any[]> {
    const where: any = {};
    if (candidateId) where.candidateId = candidateId;
    if (jobId) where.jobId = jobId;

    return this.prisma.jobMatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

interface MatchResult {
  candidateId: string;
  jobId: string;
  similarityScore: number;
  matchLevel: 'high' | 'medium' | 'low';
  analysis?: string;
}
