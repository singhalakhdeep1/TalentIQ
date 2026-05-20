import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    HealthCheck,
    HealthCheckService,
    PrismaHealthIndicator,
    HttpHealthIndicator,
    DiskHealthIndicator,
    MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly prismaIndicator: PrismaHealthIndicator,
        private readonly http: HttpHealthIndicator,
        private readonly disk: DiskHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.prismaIndicator.pingCheck('database', this.prisma),
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024), // 512 MB
            () =>
                this.http.pingCheck(
                    'ai-service',
                    `${this.config.get('aiService.url', 'http://ai-service:8000')}/health`,
                ),
        ]);
    }
}
