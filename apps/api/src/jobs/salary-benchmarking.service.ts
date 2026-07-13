/**
 * 薪资基准服务
 * 提供职位薪资基准和市场分析
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';

@Injectable()
export class SalaryBenchmarkingService {
  private readonly logger = new Logger(SalaryBenchmarkingService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 获取职位薪资基准
   */
  async getSalaryBenchmark(
    jobTitle: string,
    location: string,
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead',
  ): Promise<SalaryBenchmark> {
    // 从数据库查找历史薪资数据
    const historicalOffers = await this.prisma.jobOffer.findMany({
      where: {
        job: {
          title: { contains: jobTitle, mode: 'insensitive' },
        },
        location: { contains: location, mode: 'insensitive' },
      },
      select: {
        salaryMin: true,
        salaryMax: true,
        currency: true,
      },
    });

    // 计算基准统计
    const salaries = historicalOffers.map(o => ({
      min: o.salaryMin,
      max: o.salaryMax,
      avg: (o.salaryMin + o.salaryMax) / 2,
    }));

    const benchmark = this.calculateBenchmark(salaries, experienceLevel);

    // 使用AI增强基准数据
    const aiInsights = await this.getAiSalaryInsights(jobTitle, location, experienceLevel);

    return {
      jobTitle,
      location,
      experienceLevel,
      ...benchmark,
      insights: aiInsights,
      sampleSize: historicalOffers.length,
    };
  }

  /**
   * 计算薪资基准统计
   */
  private calculateBenchmark(
    salaries: Array<{ min: number; max: number; avg: number }>,
    experienceLevel: string,
  ): Omit<SalaryBenchmark, 'jobTitle' | 'location' | 'experienceLevel' | 'insights' | 'sampleSize'> {
    if (salaries.length === 0) {
      // 返回默认基准
      const defaults = {
        entry: { min: 50000, max: 80000, median: 65000 },
        mid: { min: 80000, max: 120000, median: 100000 },
        senior: { min: 120000, max: 180000, median: 150000 },
        lead: { min: 180000, max: 250000, median: 215000 },
      };

      const base = defaults[experienceLevel] || defaults.mid;
      return {
        min: base.min,
        max: base.max,
        median: base.median,
        percentile25: base.min,
        percentile75: base.max,
        average: base.median,
      };
    }

    const avgSalaries = salaries.map(s => s.avg);
    const minSalaries = salaries.map(s => s.min);
    const maxSalaries = salaries.map(s => s.max);

    avgSalaries.sort((a, b) => a - b);

    const median = this.calculatePercentile(avgSalaries, 50);
    const percentile25 = this.calculatePercentile(avgSalaries, 25);
    const percentile75 = this.calculatePercentile(avgSalaries, 75);
    const average = avgSalaries.reduce((a, b) => a + b, 0) / avgSalaries.length;

    return {
      min: Math.min(...minSalaries),
      max: Math.max(...maxSalaries),
      median,
      percentile25,
      percentile75,
      average,
    };
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index];
  }

  /**
   * 获取AI薪资洞察
   */
  private async getAiSalaryInsights(
    jobTitle: string,
    location: string,
    experienceLevel: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a compensation expert.Provide salary market insights for the given role, location, and experience level.
            Include:
            - Current market trends
            - In-demand skills that affect salary
            - Regional variations
            - Future outlook
            
            Keep it concise (max 150 words).`,
          },
          {
            role: 'user',
            content: `Role: ${jobTitle}\nLocation: ${location}\nExperience: ${experienceLevel}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      return response.choices[0].message.content || 'No insights available';
    } catch (error) {
      this.logger.error('AI insights failed:', error);
      return 'Market insights unavailable';
    }
  }

  /**
   * 比较候选人的期望薪资与市场基准
   */
  async compareCandidateSalary(
    candidateId: string,
    jobId: string,
    expectedSalary: number,
  ): Promise<SalaryComparison> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { title: true, location: true, salaryMin: true, salaryMax: true },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    const benchmark = await this.getSalaryBenchmark(
      job.title,
      job.location,
      'mid', // 默认中级
    );

    const isWithinRange = expectedSalary >= benchmark.min && expectedSalary <= benchmark.max;
    const isBelowMarket = expectedSalary < benchmark.percentile25;
    const isAboveMarket = expectedSalary > benchmark.percentile75;

    return {
      expectedSalary,
      marketMin: benchmark.min,
      marketMax: benchmark.max,
      marketMedian: benchmark.median,
      isWithinRange,
      isBelowMarket,
      isAboveMarket,
      difference: expectedSalary - benchmark.median,
      differencePercent: ((expectedSalary - benchmark.median) / benchmark.median) * 100,
    };
  }

  /**
   * 获取薪资趋势报告
   */
  async getSalaryTrends(
    jobTitle: string,
    location: string,
    months: number = 12,
  ): Promise<SalaryTrend[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const offers = await this.prisma.jobOffer.findMany({
      where: {
        job: {
          title: { contains: jobTitle, mode: 'insensitive' },
        },
        location: { contains: location, mode: 'insensitive' },
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        salaryMin: true,
        salaryMax: true,
        createdAt: true,
      },
    });

    // 按月分组
    const monthlyData = new Map<string, number[]>();
    
    offers.forEach(offer => {
      const monthKey = offer.createdAt.toISOString().slice(0, 7); // YYYY-MM
      const avgSalary = (offer.salaryMin + offer.salaryMax) / 2;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey).push(avgSalary);
    });

    // 计算每月平均值
    const trends: SalaryTrend[] = [];
    monthlyData.forEach((salaries, month) => {
      const avg = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      trends.push({
        month,
        averageSalary: avg,
        offerCount: salaries.length,
      });
    });

    return trends;
  }

  /**
   * 推荐薪资范围
   */
  async recommendSalaryRange(
    jobTitle: string,
    location: string,
    experienceLevel: string,
    skills: string[],
  ): Promise<SalaryRecommendation> {
    const benchmark = await this.getSalaryBenchmark(jobTitle, location, experienceLevel as any);

    // 技能溢价
    const premiumSkills = ['machine learning', 'cloud architecture', 'blockchain', 'cybersecurity'];
    const hasPremiumSkills = skills.some(skill => 
      premiumSkills.some(premium => skill.toLowerCase().includes(premium))
    );

    const skillPremium = hasPremiumSkills ? 0.15 : 0; // 15% premium for premium skills

    const recommendedMin = benchmark.min * (1 + skillPremium);
    const recommendedMax = benchmark.max * (1 + skillPremium);
    const recommendedMedian = benchmark.median * (1 + skillPremium);

    return {
      recommendedMin: Math.round(recommendedMin),
      recommendedMax: Math.round(recommendedMax),
      recommendedMedian: Math.round(recommendedMedian),
      skillPremium: skillPremium * 100,
      reasoning: hasPremiumSkills 
        ? 'Premium skills detected, salary range adjusted upward'
        : 'Standard market rate applied',
    };
  }
}

interface SalaryBenchmark {
  jobTitle: string;
  location: string;
  experienceLevel: string;
  min: number;
  max: number;
  median: number;
  percentile25: number;
  percentile75: number;
  average: number;
  insights: string;
  sampleSize: number;
}

interface SalaryComparison {
  expectedSalary: number;
  marketMin: number;
  marketMax: number;
  marketMedian: number;
  isWithinRange: boolean;
  isBelowMarket: boolean;
  isAboveMarket: boolean;
  difference: number;
  differencePercent: number;
}

interface SalaryTrend {
  month: string;
  averageSalary: number;
  offerCount: number;
}

interface SalaryRecommendation {
  recommendedMin: number;
  recommendedMax: number;
  recommendedMedian: number;
  skillPremium: number;
  reasoning: string;
}
