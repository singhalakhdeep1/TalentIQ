import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('overview')
    getOverview() {
        return this.dashboardService.getOverview();
    }

    @Get('jobs/:jobId/overview')
    getJobOverview(@Param('jobId') jobId: string) {
        return this.dashboardService.getJobOverview(jobId);
    }
}
