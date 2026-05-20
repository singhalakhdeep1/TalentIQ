import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import * as client from 'prom-client';

// ─── Register metrics ─────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request duration in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [register],
});

export const candidatesCreatedTotal = new client.Counter({
    name: 'talentiq_candidates_created_total',
    help: 'Total number of candidates created',
    registers: [register],
});

export const interviewsCompletedTotal = new client.Counter({
    name: 'talentiq_interviews_completed_total',
    help: 'Total voice interviews completed',
    labelNames: ['recommendation'],
    registers: [register],
});

export const resumeParsingDuration = new client.Histogram({
    name: 'talentiq_resume_parsing_duration_ms',
    help: 'AI resume parsing duration in ms',
    buckets: [500, 1000, 2000, 5000, 10000],
    registers: [register],
});

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
    @Get()
    @ApiExcludeEndpoint()
    async getMetrics(@Res() res: Response) {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    }
}
