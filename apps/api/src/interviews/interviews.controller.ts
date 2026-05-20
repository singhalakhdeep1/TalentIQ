import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewsController {
    constructor(private readonly prisma: PrismaService) { }

    @Post()
    @ApiOperation({ summary: 'Schedule an interview for a candidate' })
    async scheduleInterview(
        @Body()
        body: {
            candidateId: string;
            jobId: string;
            scheduledAt: string;
            interviewType: 'VOICE' | 'VIDEO' | 'TECHNICAL' | 'HR';
        },
        @Request() req: any,
    ) {
        const interview = await this.prisma.interview.create({
            data: {
                id: uuidv4(),
                candidateId: body.candidateId,
                jobId: body.jobId,
                scheduledAt: new Date(body.scheduledAt),
                interviewType: body.interviewType,
                scheduledById: req.user.id,
                status: 'SCHEDULED',
            },
        });
        return interview;
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get interview details including voice session transcript' })
    async getInterview(@Param('id') id: string) {
        return this.prisma.interview.findUniqueOrThrow({
            where: { id },
            include: { voiceSession: true },
        });
    }

    @Get(':id/voice-session')
    @ApiOperation({ summary: 'Get voice session transcript and AI analysis' })
    async getVoiceSession(@Param('id') interviewId: string) {
        return this.prisma.voiceSession.findUnique({ where: { interviewId } });
    }
}
