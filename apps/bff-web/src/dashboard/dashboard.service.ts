import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
    private readonly baseUrl = process.env.API_BASE_URL ?? 'http://api:4000';

    private async apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers: { 'Content-Type': 'application/json', ...init.headers },
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error(data?.message ?? res.statusText);
        return data as T;
    }

    async getOverview() {
        const [jobs, candidates] = await Promise.all([
            this.apiFetch<{ data: Array<{ status?: string }>; total?: number }>('/jobs?page=1&limit=20'),
            this.apiFetch<{ data: unknown[]; total?: number }>('/candidates?page=1&limit=100'),
        ]);

        return {
            jobs,
            candidates,
            metrics: {
                openJobs: (jobs?.data ?? []).filter((job) => job.status === 'OPEN').length,
                totalCandidates: candidates?.total ?? 0,
            },
        };
    }

    async getJobOverview(jobId: string) {
        const [job, funnel, similarCandidates] = await Promise.all([
            this.apiFetch(`/jobs/${jobId}`),
            this.apiFetch(`/analytics/jobs/${jobId}/funnel`),
            this.apiFetch(`/jobs/${jobId}/similar-candidates`),
        ]);

        return { job, funnel, similarCandidates };
    }
}
