import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DashboardService {
    private readonly baseUrl = process.env.API_BASE_URL ?? 'http://api:4000';

    async getOverview() {
        const [jobs, candidates] = await Promise.all([
            axios.get(`${this.baseUrl}/jobs`, { params: { page: 1, limit: 20 } }),
            axios.get(`${this.baseUrl}/candidates`, { params: { page: 1, limit: 100 } }),
        ]);

        return {
            jobs: jobs.data,
            candidates: candidates.data,
            metrics: {
                openJobs: (jobs.data?.data ?? []).filter((job: { status?: string }) => job.status === 'OPEN').length,
                totalCandidates: candidates.data?.total ?? 0,
            },
        };
    }

    async getJobOverview(jobId: string) {
        const [job, funnel, similarCandidates] = await Promise.all([
            axios.get(`${this.baseUrl}/jobs/${jobId}`),
            axios.get(`${this.baseUrl}/analytics/jobs/${jobId}/funnel`),
            axios.get(`${this.baseUrl}/jobs/${jobId}/similar-candidates`),
        ]);

        return {
            job: job.data,
            funnel: funnel.data,
            similarCandidates: similarCandidates.data,
        };
    }
}
