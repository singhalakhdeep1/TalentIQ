import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobsService, CreateJobDto } from './jobs.service';
import { AiService } from '../ai/ai.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
    constructor(
        private readonly jobsService: JobsService,
        private readonly aiService: AiService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new job posting' })
    async createJob(@Body() dto: CreateJobDto, @Request() req: any) {
        return this.jobsService.createJob({ ...dto, createdById: req.user.id });
    }

    @Get()
    @ApiOperation({ summary: 'List jobs with filters' })
    async listJobs(@Query() query: any) {
        return this.jobsService.listJobs(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get job details with applications' })
    async getJob(@Param('id') id: string) {
        return this.jobsService.getJob(id);
    }

    @Post(':id/apply')
    @ApiOperation({ summary: 'Apply to a job (creates application)' })
    async apply(@Param('id') jobId: string, @Body() body: { candidateId: string }) {
        return this.jobsService.applyToJob(body.candidateId, jobId);
    }

    @Get(':id/similar-candidates')
    @ApiOperation({ summary: 'Get semantically matched candidates for this job' })
    async similarCandidates(
        @Param('id') jobId: string,
        @Query('limit') limit?: string,
        @Query('threshold') threshold?: string,
    ) {
        return this.aiService.findSimilarCandidates(
            jobId,
            limit ? parseInt(limit) : 20,
            threshold ? parseFloat(threshold) : 0.7,
        );
    }

    @Patch(':id/close')
    @ApiOperation({ summary: 'Close a job posting' })
    async closeJob(@Param('id') id: string) {
        await this.jobsService.closeJob(id);
        return { message: 'Job closed' };
    }
}
