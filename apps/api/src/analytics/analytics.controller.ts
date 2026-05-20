import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('jobs/:jobId/funnel')
    @ApiOperation({ summary: 'Get hiring funnel metrics for a job (ClickHouse OLAP)' })
    async getFunnel(@Param('jobId') jobId: string) {
        return this.analyticsService.getHiringFunnel(jobId);
    }

    @Get('organizations/:orgId/trends')
    @ApiOperation({ summary: 'Get 30-day recruitment trend data' })
    async getTrends(@Param('orgId') orgId: string, @Query('days') days?: string) {
        return this.analyticsService.getRecruitmentTrends(orgId, days ? parseInt(days) : 30);
    }
}
