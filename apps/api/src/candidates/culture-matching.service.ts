/**
 * 文化匹配服务
 * 使用AI分析候选人与公司文化的匹配度
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';

@Injectable()
export class CultureMatchingService {
  private readonly logger = new Logger(CultureMatchingService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 分析候选人与公司文化的匹配度
   */
  async analyzeCultureMatch(
    candidateId: string,
    companyId: string,
  ): Promise<CultureMatchResult> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!candidate || !company) {
      throw new Error('Candidate or company not found');
    }

    // 使用AI分析文化匹配
    const analysis = await this.aiCultureAnalysis(candidate, company);

    // 计算匹配分数
    const matchScore = this.calculateMatchScore(analysis);

    // 保存匹配结果
    await this.prisma.cultureMatch.create({
      data: {
        candidateId,
        companyId,
        matchScore,
        analysis,
        strengths: analysis.strengths,
        concerns: analysis.concerns,
      },
    });

    this.logger.log(`Culture match analyzed: ${candidateId} -> ${companyId}: ${matchScore}%`);

    return {
      candidateId,
      companyId,
      matchScore,
      matchLevel: matchScore > 80 ? 'excellent' : matchScore > 60 ? 'good' : matchScore > 40 ? 'moderate' : 'poor',
      analysis,
    };
  }

  /**
   * AI文化分析
   */
  private async aiCultureAnalysis(
    candidate: any,
    company: any,
  ): Promise<CultureAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an organizational culture expert. Analyze the fit between a candidate and company culture.
            Evaluate based on:
            - Work style preferences
            - Communication style
            - Values alignment
            - Team dynamics
            - Growth mindset
            
            Return a JSON object with:
            - strengths: array of matching aspects
            - concerns: array of potential mismatches
            - recommendations: array of suggestions for better fit`,
          },
          {
            role: 'user',
            content: `Company Culture: ${company.cultureDescription || company.description}\nCompany Values: ${company.values || 'Not specified'}\n\nCandidate Profile: ${candidate.name}\nCandidate Experience: ${JSON.stringify(candidate.embedding?.parsedData || {})}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        strengths: result.strengths || [],
        concerns: result.concerns || [],
        recommendations: result.recommendations || [],
      };
    } catch (error) {
      this.logger.error('AI culture analysis failed:', error);
      return {
        strengths: ['Candidate profile available'],
        concerns: ['AI analysis unavailable'],
        recommendations: ['Manual review recommended'],
      };
    }
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScore(analysis: CultureAnalysis): number {
    const strengthCount = analysis.strengths.length;
    const concernCount = analysis.concerns.length;
    const totalFactors = strengthCount + concernCount;

    if (totalFactors === 0) return 50;

    return Math.round((strengthCount / totalFactors) * 100);
  }

  /**
   * 批量文化匹配分析
   */
  async batchCultureMatch(
    companyId: string,
    candidateIds: string[],
  ): Promise<CultureMatchResult[]> {
    const results = await Promise.all(
      candidateIds.map(candidateId =>
        this.analyzeCultureMatch(candidateId, companyId),
      ),
    );

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * 获取公司文化画像
   */
  async getCompanyCultureProfile(companyId: string): Promise<CompanyCultureProfile> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // 分析现有员工的文化匹配数据
    const cultureMatches = await this.prisma.cultureMatch.findMany({
      where: { companyId },
      include: { candidate: true },
    });

    const avgMatchScore = cultureMatches.length > 0
      ? cultureMatches.reduce((sum, m) => sum + m.matchScore, 0) / cultureMatches.length
      : 0;

    const commonStrengths = this.extractCommonFactors(cultureMatches, 'strengths');
    const commonConcerns = this.extractCommonFactors(cultureMatches, 'concerns');

    return {
      companyId,
      company: company.name,
      cultureDescription: company.cultureDescription,
      values: company.values,
      averageMatchScore: Math.round(avgMatchScore),
      totalMatches: cultureMatches.length,
      commonStrengths,
      commonConcerns,
    };
  }

  /**
   * 提取常见因素
   */
  private extractCommonFactors(matches: any[], field: string): string[] {
    const factorCounts = new Map<string, number>();

    matches.forEach(match => {
      const factors = match[field] || [];
      factors.forEach((factor: string) => {
        factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
      });
    });

    // 返回出现频率最高的因素
    return Array.from(factorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([factor]) => factor);
  }

  /**
   * 文化匹配建议
   */
  async getCultureMatchRecommendations(
    candidateId: string,
    companyId: string,
  ): Promise<string[]> {
    const match = await this.prisma.cultureMatch.findFirst({
      where: { candidateId, companyId },
    });

    if (!match) {
      // 如果没有匹配记录，先进行分析
      const result = await this.analyzeCultureMatch(candidateId, companyId);
      return result.analysis.recommendations;
    }

    return match.recommendations || [];
  }
}

interface CultureMatchResult {
  candidateId: string;
  companyId: string;
  matchScore: number;
  matchLevel: 'excellent' | 'good' | 'moderate' | 'poor';
  analysis: CultureAnalysis;
}

interface CultureAnalysis {
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

interface CompanyCultureProfile {
  companyId: string;
  company: string;
  cultureDescription: string;
  values: string;
  averageMatchScore: number;
  totalMatches: number;
  commonStrengths: string[];
  commonConcerns: string[];
}
