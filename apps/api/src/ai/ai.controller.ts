import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('jobs/:jobId/embed')
    @ApiOperation({ summary: 'Generate embedding for a job description' })
    async embedJob(@Param('jobId') jobId: string, @Body() body: { description: string }) {
        await this.aiService.embedJobDescription(jobId, body.description);
        return { message: 'Job embedding generated' };
    }

    @Post('jobs/:jobId/similar-candidates')
    @ApiOperation({ summary: 'Find semantically similar candidates via pgvector' })
    async similarCandidates(
        @Param('jobId') jobId: string,
        @Body() body: { limit?: number; threshold?: number },
    ) {
        return this.aiService.findSimilarCandidates(jobId, body.limit, body.threshold);
    }

    @Post('jobs/:jobId/screen/:candidateId')
    @ApiOperation({ summary: 'Run LangGraph multi-agent screening pipeline' })
    async screenCandidate(
        @Param('jobId') jobId: string,
        @Param('candidateId') candidateId: string,
    ) {
        return this.aiService.runScreeningAgent(candidateId, jobId);
    }
}
