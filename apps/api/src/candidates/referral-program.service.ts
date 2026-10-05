/**
 * 推荐计划服务
 * 管理员工推荐计划和奖励
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';

@Injectable()
export class ReferralProgramService {
  private readonly logger = new Logger(ReferralProgramService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 生成推荐码
   */
  async generateReferralCode(employeeId: string): Promise<{ code: string; referralLink: string }> {
    const code = this.generateUniqueCode();

    await this.prisma.referralCode.create({
      data: {
        id: uuidv4(),
        code,
        employeeId,
        status: 'active',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });

    const referralLink = `https://talentiq.com/ref/${code}`;

    this.logger.log(`Generated referral code ${code} for employee ${employeeId}`);

    return { code, referralLink };
  }

  /**
   * 使用推荐码
   */
  async useReferralCode(
    code: string,
    candidateId: string,
  ): Promise<{ success: boolean; message: string; bonus?: number }> {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code },
      include: { employee: true },
    });

    if (!referralCode) {
      return { success: false, message: 'Invalid referral code' };
    }

    if (referralCode.status !== 'active') {
      return { success: false, message: 'Referral code is not active' };
    }

    if (new Date() > referralCode.expiresAt) {
      await this.prisma.referralCode.update({
        where: { id: referralCode.id },
        data: { status: 'expired' },
      });
      return { success: false, message: 'Referral code has expired' };
    }

    // 检查是否已经使用过
    const existingUsage = await this.prisma.referralUsage.findFirst({
      where: { referralCodeId: referralCode.id, candidateId },
    });

    if (existingUsage) {
      return { success: false, message: 'Referral code already used' };
    }

    // 记录使用
    await this.prisma.referralUsage.create({
      data: {
        id: uuidv4(),
        referralCodeId: referralCode.id,
        candidateId,
        employeeId: referralCode.employeeId,
        usedAt: new Date(),
      },
    });

    // 计算奖励
    const bonus = await this.calculateReferralBonus(referralCode.employeeId);

    // 更新员工推荐统计
    await this.prisma.employee.update({
      where: { id: referralCode.employeeId },
      data: {
        referralCount: { increment: 1 },
        totalReferralBonus: { increment: bonus },
      },
    });

    this.logger.log(`Referral code ${code} used by candidate ${candidateId}`);

    return {
      success: true,
      message: 'Referral code applied successfully',
      bonus,
    };
  }

  /**
   * 计算推荐奖励
   */
  private async calculateReferralBonus(employeeId: string): Promise<number> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { referralCount: true },
    });

    const referralCount = employee?.referralCount || 0;

    // 奖励阶梯
    if (referralCount < 5) {
      return 500; // 前5个推荐: $500
    } else if (referralCount < 10) {
      return 750; // 5-10个推荐: $750
    } else if (referralCount < 20) {
      return 1000; // 10-20个推荐: $1000
    } else {
      return 1500; // 20+个推荐: $1500
    }
  }

  /**
   * 获取员工推荐统计
   */
  async getReferralStats(employeeId: string): Promise<ReferralStats> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        referralCount: true,
        totalReferralBonus: true,
      },
    });

    const referralCodes = await this.prisma.referralCode.findMany({
      where: { employeeId },
      include: {
        usages: {
          include: {
            candidate: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    const totalUsages = referralCodes.reduce((sum, code) => sum + code.usages.length, 0);
    const hiredCount = referralCodes.reduce(
      (sum, code) => sum + code.usages.filter(u => u.candidate.status === 'hired').length,
      0,
    );

    const pendingBonuses = referralCodes.reduce(
      (sum, code) => sum + code.usages.filter(u => u.candidate.status === 'interviewing').length * 500,
      0,
    );

    return {
      employeeId,
      totalReferrals: employee?.referralCount || 0,
      totalBonusEarned: employee?.totalReferralBonus || 0,
      totalUsages,
      hiredCount,
      pendingBonuses,
      activeCodes: referralCodes.filter(c => c.status === 'active').length,
    };
  }

  /**
   * 获取推荐排行榜
   */
  async getReferralLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const employees = await this.prisma.employee.findMany({
      orderBy: { referralCount: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        referralCount: true,
        totalReferralBonus: true,
      },
    });

    return employees.map(emp => ({
      employeeId: emp.id,
      name: emp.name,
      email: emp.email,
      referralCount: emp.referralCount,
      totalBonus: emp.totalReferralBonus,
    }));
  }

  /**
   * 处理推荐奖励发放
   */
  async processReferralPayout(employeeId: string): Promise<{ success: boolean; amount: number; message: string }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        totalReferralBonus: true,
        pendingPayout: true,
      },
    });

    if (!employee) {
      return { success: false, amount: 0, message: 'Employee not found' };
    }

    if (employee.totalReferralBonus <= 0) {
      return { success: false, amount: 0, message: 'No bonus to payout' };
    }

    // 在生产环境中，这里会触发实际的支付流程
    // 这里简化为记录支付
    await this.prisma.referralPayout.create({
      data: {
        id: uuidv4(),
        employeeId,
        amount: employee.totalReferralBonus,
        status: 'processed',
        processedAt: new Date(),
      },
    });

    // 重置奖金
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        totalReferralBonus: 0,
      },
    });

    this.logger.log(`Processed referral payout for employee ${employeeId}: $${employee.totalReferralBonus}`);

    return {
      success: true,
      amount: employee.totalReferralBonus,
      message: 'Payout processed successfully',
    };
  }

  /**
   * 获取推荐码详情
   */
  async getReferralCodeDetails(code: string): Promise<ReferralCodeDetails> {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code },
      include: {
        employee: {
          select: {
            name: true,
            email: true,
          },
        },
        usages: {
          include: {
            candidate: {
              select: {
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!referralCode) {
      throw new Error('Referral code not found');
    }

    return {
      code: referralCode.code,
      status: referralCode.status,
      createdAt: referralCode.createdAt,
      expiresAt: referralCode.expiresAt,
      employee: referralCode.employee,
      totalUsages: referralCode.usages.length,
      hiredCount: referralCode.usages.filter(u => u.candidate.status === 'hired').length,
    };
  }

  /**
   * 使推荐码失效
   */
  async deactivateReferralCode(code: string): Promise<void> {
    await this.prisma.referralCode.update({
      where: { code },
      data: { status: 'inactive' },
    });

    this.logger.log(`Deactivated referral code ${code}`);
  }

  /**
   * 生成唯一推荐码
   */
  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(randomInt(chars.length));
    }
    return code;
  }

  /**
   * 获取推荐活动报告
   */
  async getReferralActivityReport(
    startDate: Date,
    endDate: Date,
  ): Promise<ReferralActivityReport> {
    const usages = await this.prisma.referralUsage.findMany({
      where: {
        usedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: true,
        candidate: true,
      },
    });

    const totalUsages = usages.length;
    const hiredCount = usages.filter(u => u.candidate.status === 'hired').length;
    const interviewCount = usages.filter(u => u.candidate.status === 'interviewing').length;

    const totalBonus = usages.reduce((sum, u) => {
      return sum + this.calculateReferralBonusSync(u.employeeId);
    }, 0);

    return {
      period: { startDate, endDate },
      totalUsages,
      hiredCount,
      interviewCount,
      totalBonus,
      hireRate: totalUsages > 0 ? (hiredCount / totalUsages) * 100 : 0,
    };
  }

  /**
   * 同步计算推荐奖励（用于报告）
   */
  private calculateReferralBonusSync(employeeId: string): number {
    // 简化实现，实际应该从数据库获取
    return 500;
  }
}

interface ReferralStats {
  employeeId: string;
  totalReferrals: number;
  totalBonusEarned: number;
  totalUsages: number;
  hiredCount: number;
  pendingBonuses: number;
  activeCodes: number;
}

interface LeaderboardEntry {
  employeeId: string;
  name: string;
  email: string;
  referralCount: number;
  totalBonus: number;
}

interface ReferralCodeDetails {
  code: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  employee: { name: string; email: string };
  totalUsages: number;
  hiredCount: number;
}

interface ReferralActivityReport {
  period: { startDate: Date; endDate: Date };
  totalUsages: number;
  hiredCount: number;
  interviewCount: number;
  totalBonus: number;
  hireRate: number;
}
