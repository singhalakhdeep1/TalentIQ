import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('resume')
@UseGuards(JwtAuthGuard)
export class ResumeController {
    constructor(private readonly resumeService: ResumeService) { }

    @Get('candidates/:candidateId/download-url')
    getDownloadUrl(@Param('candidateId') candidateId: string) {
        return this.resumeService.getResumeDownloadUrl(candidateId);
    }

    @Post('candidates/:candidateId/reprocess')
    reprocess(@Param('candidateId') candidateId: string) {
        return this.resumeService.reprocessResume(candidateId);
    }

    @Get('candidates/:candidateId/insights')
    getInsights(@Param('candidateId') candidateId: string) {
        return this.resumeService.getResumeInsights(candidateId);
    }
}
